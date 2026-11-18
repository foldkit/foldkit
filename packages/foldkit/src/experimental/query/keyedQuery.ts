import {
  Array,
  Effect,
  Function,
  HashMap,
  Number,
  Option,
  Order,
  Predicate,
  Record,
  Schema,
  pipe,
} from 'effect'

import * as AsyncData from '../../asyncData/index.js'
import * as Command from '../../command/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import {
  type AsyncDataTransition,
  type CompletedFetchOf,
  type FoldLens,
  type KeyedArgs,
  type LiftConfig,
  type LiftKeyedQuery,
  type ParentFieldConfig,
  type QueryStore,
  applyTransition,
  isParentFieldConfig,
  liftChildFold,
  parentFieldToLens,
  runExecute,
} from './internal.js'

export type SyncFields = {
  readonly [x: PropertyKey]: Schema.Codec<unknown, unknown, never, never>
}

const canonicalizeJsonEntry = ([key, value]: readonly [
  string,
  Schema.Json,
]): readonly [string, Schema.Json] => [key, canonicalizeJson(value)]

const jsonEntryOrder = Order.mapInput(
  Order.String,
  ([key]: readonly [string, Schema.Json]) => key,
)

const isJsonObject = (value: Schema.Json): value is Schema.JsonObject =>
  Predicate.isObject(value) && !globalThis.Array.isArray(value)

const canonicalizeJson = (value: Schema.Json): Schema.Json => {
  if (globalThis.Array.isArray(value)) {
    return Array.map(value, canonicalizeJson)
  }

  if (isJsonObject(value)) {
    return pipe(
      value,
      Record.toEntries,
      Array.sort(jsonEntryOrder),
      Array.map(canonicalizeJsonEntry),
      Record.fromEntries,
    )
  }

  return value
}

const encodeJsonString = Schema.encodeUnknownSync(
  Schema.fromJsonString(Schema.Json),
)

const encodeKey = <A, I>(schema: Schema.Codec<A, I, never, never>) => {
  const encodeJson = Schema.encodeUnknownSync(Schema.toCodecJson(schema))

  return (value: A): string =>
    encodeJsonString(canonicalizeJson(encodeJson(value)))
}

export type KeyedQueryConfig<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  R,
> = Readonly<{
  name: Name
  data: Schema.Codec<A, AI, never, never>
  error: Schema.Codec<E, EI, never, never>
  args: Fields
  toKey?: (args: Schema.Schema.Type<Schema.Struct<Fields>>) => string
  execute: (
    args: Schema.Schema.Type<Schema.Struct<Fields>>,
  ) => Effect.Effect<A, E, R>
}>

const makeKeyedQueryMessage = <A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) =>
  defineMessageUnion({
    CompletedFetch: {
      args: Args,
      generation: Schema.Number,
      result: Schema.Result(data, error),
    },
  })

/**
 * Schema-backed Message union dispatched when a KeyedQuery fetch completes.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type KeyedQueryMessage<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryMessage<A, AI, E, EI, Fields>>

/** Builds the Model Schema for a KeyedQuery. */
export const makeKeyedQueryModel = <A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) => {
  const asyncData = AsyncData.Schema(data, error)

  return Schema.Struct({
    generation: Schema.Number,
    entries: Schema.HashMap(
      Schema.String,
      Schema.Struct({
        args: Args,
        data: asyncData.schema,
        generation: Schema.Number,
      }),
    ),
  })
}

/**
 * Model Schema for a KeyedQuery containing retained `AsyncData` entries.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type KeyedQueryModel<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryModel<A, AI, E, EI, Fields>>

/**
 * Submodel for fetching and retaining `AsyncData` values by argument key.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export interface KeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  R = never,
> {
  /** Schema for this KeyedQuery's Model. */
  readonly Model: KeyedQueryModel<A, AI, E, EI, Fields>
  /** Schema-backed union of Messages handled by this KeyedQuery. */
  readonly Message: KeyedQueryMessage<A, AI, E, EI, Fields>
  /**
   * Command definition for matching this KeyedQuery's pending fetch in Story
   * and Scene tests. Start fetches through a loading operation so the Model
   * and request generation advance together; do not call this directly.
   */
  readonly Fetch: Command.CommandDefinitionWithArgs<
    `Fetch${Name}`,
    {
      readonly args: Schema.Struct<Fields>
      readonly generation: typeof Schema.Number
    },
    Effect.Effect<
      CompletedFetchOf<KeyedQueryMessage<A, AI, E, EI, Fields>>,
      never,
      R
    >
  >
  /**
   * Creates a KeyedQuery Model for initial parent Model construction. Never
   * replace a live KeyedQuery with `init()`: it can reuse an in-flight request
   * generation. Use `reset` instead.
   */
  readonly init: () => KeyedQueryModel<A, AI, E, EI, Fields>['Type']
  /** Clears every entry while preserving request identity. */
  readonly reset: (
    model: KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
  ) => Update.Return<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type']
  >
  /** Reads one entry, returning `Idle` when that entry does not exist. */
  readonly read: (
    model: KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    args: KeyedArgs<Fields>,
  ) => AsyncData.AsyncData<A, E>
  /** Folds a keyed Fetch completion into the matching entry. */
  readonly update: (
    model: KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    message: KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
  ) => Update.Return<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type']
  >
  /** Refreshes a loaded entry and does nothing when it has no data. */
  readonly revalidate: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  /** Loads a missing entry or refreshes a loaded entry. */
  readonly revalidateOrLoad: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  /** Loads an entry only when it has no usable value. */
  readonly loadIfMissing: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  /** Lifts this KeyedQuery's update and loading operations into a parent Model. */
  readonly lift: LiftKeyedQuery<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  /** Executes one keyed fetch directly and returns settled `AsyncData`. */
  readonly run: (
    args: KeyedArgs<Fields>,
  ) => Effect.Effect<AsyncData.AsyncData<A, E>, never, R>
}

export function defineKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  R,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, R>,
): KeyedQuery<Name, A, AI, E, EI, Fields, R> {
  const asyncData = AsyncData.Schema(config.data, config.error)
  type EntryData = typeof asyncData.schema.Type
  const Args = Schema.Struct(config.args)
  type Args = typeof Args.Type
  if (Array.isArrayEmpty(Record.keys(config.args))) {
    throw new Error(
      `Query.define("${config.name}"): keyed args must include at least one field`,
    )
  }

  const argsToKey = config.toKey ?? encodeKey(Args)

  const Message = makeKeyedQueryMessage(config.data, config.error, Args)
  type Message = KeyedQueryMessage<A, AI, E, EI, Fields>['Type']

  const Fetch = Command.define(`Fetch${config.name}`, {
    args: { args: Args, generation: Schema.Number },
    messages: [Message.CompletedFetch],
    execute: ({ args, generation }) =>
      pipe(
        config.execute(args),
        Effect.result,
        Effect.map((result): typeof Message.CompletedFetch.Type =>
          // NOTE: CompletedFetch's constructor input view rejects args that are already the decoded Type.
          ({
            _tag: 'CompletedFetch',
            args,
            generation,
            result,
          }),
        ),
      ),
  })

  const Model = makeKeyedQueryModel(config.data, config.error, Args)
  type Model = KeyedQueryModel<A, AI, E, EI, Fields>['Type']
  type UpdateReturn = Update.Return<Model, Message, R>
  type PureUpdateReturn = Update.Return<Model, Message>

  const store: QueryStore<Model, Args, A, E, Message, R> = {
    read: (model, args) =>
      AsyncData.fromOptionOrIdle(
        Option.map(
          HashMap.get(model.entries, argsToKey(args)),
          entry => entry.data,
        ),
      ),
    start: (model, args, data) => {
      const nextGeneration = Number.increment(model.generation)

      return {
        model: modifyFields(model, {
          entries: HashMap.set(argsToKey(args), {
            args,
            data,
            generation: nextGeneration,
          }),
          generation: () => nextGeneration,
        }),
        generation: nextGeneration,
      }
    },
    fetch: (args, generation) => Fetch({ args, generation }),
  }

  const init = (): Model =>
    Model.make({ entries: HashMap.empty(), generation: 0 })
  const reset = (model: Model): PureUpdateReturn => ({
    model: modifyFields(model, { entries: () => HashMap.empty() }),
  })
  const read = (model: Model, args: Args): EntryData => store.read(model, args)

  const liftTransition = (
    transition: AsyncDataTransition,
  ): Update.Fold<Model, Message, Args, R> =>
    Function.dual(2, (model: Model, args: Args): UpdateReturn =>
      applyTransition(store, model, args, transition),
    )

  const revalidate = liftTransition(AsyncData.revalidate)
  const revalidateOrLoad = liftTransition(AsyncData.revalidateOrLoad)
  const loadIfMissing = liftTransition(AsyncData.loadIfMissing)

  const update = (model: Model, message: Message): PureUpdateReturn =>
    Message.match<PureUpdateReturn>(message, {
      CompletedFetch({ args, generation, result }) {
        const key = argsToKey(args)
        const maybeEntry = HashMap.get(model.entries, key)

        if (Option.isNone(maybeEntry)) {
          return { model }
        }

        const entry = maybeEntry.value

        if (
          !AsyncData.isPending(entry.data) ||
          generation !== entry.generation
        ) {
          return { model }
        }

        return {
          model: modifyFields(model, {
            entries: HashMap.set(
              key,
              modifyFields(entry, {
                data: () => AsyncData.settle(entry.data, result),
              }),
            ),
          }),
        }
      },
    })

  const liftFromLens = <ParentModel, ParentMessage>(
    lens: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ) => ({
    fold: Update.foldChild({ update, ...lens }),
    reset: Update.foldChildStep({
      update: reset,
      ...lens,
    }),
    revalidate: liftChildFold(revalidate, lens),
    revalidateOrLoad: liftChildFold(revalidateOrLoad, lens),
    loadIfMissing: liftChildFold(loadIfMissing, lens),
  })

  function lift<ParentModel, ParentMessage>(
    config: ParentFieldConfig<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<LiftKeyedQuery<Model, Message, Args, R>>
  function lift<ParentModel, ParentMessage>(
    config: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<LiftKeyedQuery<Model, Message, Args, R>>
  function lift<ParentModel, ParentMessage>(
    config: LiftConfig<ParentModel, ParentMessage, Model, Message>,
  ) {
    if (isParentFieldConfig(config)) {
      return liftFromLens(parentFieldToLens(config))
    }

    return liftFromLens(config)
  }

  const run = (args: Args): Effect.Effect<EntryData, never, R> =>
    runExecute(config.execute(args))

  return {
    Model,
    Message,
    Fetch,
    init,
    reset,
    read,
    update,
    revalidate,
    revalidateOrLoad,
    loadIfMissing,
    lift,
    run,
  } satisfies KeyedQuery<Name, A, AI, E, EI, Fields, R>
}

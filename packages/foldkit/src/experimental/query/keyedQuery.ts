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
  type AnyFoldOutMessage,
  type AsyncDataTransition,
  type CompletedFetchOf,
  type FoldLens,
  type FoldOutMessageConfig,
  type KeyedArgs,
  type KeyedDataTransform,
  type KeyedDataWrite,
  type LiftConfig,
  type LiftKeyedQuery,
  type LiftedKeyedQuery,
  type ParentFieldConfig,
  type QueryStore,
  applyTransition,
  isParentFieldConfig,
  liftChildFold,
  parentFieldToLens,
  runExecute,
} from './internal.js'
import { transformRetainedData } from './retainedData.js'

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

const makeKeyedQueryOutMessage = <A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) =>
  defineMessageUnion({
    AcceptedFetch: { args: Args, result: Schema.Result(data, error) },
  })

/**
 * Schema-backed OutMessage union a KeyedQuery emits when it accepts the result
 * of an entry's current Fetch. A late or superseded completion emits nothing.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type KeyedQueryOutMessage<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryOutMessage<A, AI, E, EI, Fields>>

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
    KeyedQueryOutMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    A,
    R
  >
  /** Executes one keyed fetch directly and returns settled `AsyncData`. */
  readonly run: (
    args: KeyedArgs<Fields>,
  ) => Effect.Effect<AsyncData.AsyncData<A, E>, never, R>
  /**
   * Schema-backed union of OutMessages emitted by `updateWithOutMessage`.
   * Pass `foldOutMessage` to `lift` to fold each accepted Fetch result into
   * the parent. When its Step returns Commands that need services, pass
   * them as the third type argument: `lift<Model, Message, HttpClient>`.
   */
  readonly OutMessage: KeyedQueryOutMessage<A, AI, E, EI, Fields>
  /**
   * Folds a keyed Fetch completion like `update` and returns an
   * `AcceptedFetch` OutMessage when the KeyedQuery accepts the result. Late
   * and superseded completions leave the Model unchanged and return no
   * OutMessage.
   */
  readonly updateWithOutMessage: (
    model: KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    message: KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
  ) => Update.ReturnWithOutMessage<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedQueryOutMessage<A, AI, E, EI, Fields>['Type']
  >
  /**
   * Writes `data` into the entry for `args` as `Success` without fetching,
   * creating the entry when it does not exist. Advances the request
   * generation, so a pending Fetch's result for that entry is ignored.
   */
  readonly setData: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedDataWrite<KeyedArgs<Fields>, A>
  >
  /**
   * Transforms the retained data of the entry for `args` without fetching.
   * `Success` and `Refreshing` become `Success`, and `Stale` stays `Stale`
   * with its error. Advances the request generation, so a pending Fetch's
   * result for that entry is ignored. Leaves the Model unchanged when the
   * entry has no data.
   */
  readonly updateData: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedDataTransform<KeyedArgs<Fields>, A>
  >
  /**
   * Builds a KeyedQuery Model holding the given entries, for test fixtures.
   * Entries are keyed the same way loading operations key them, and a later
   * entry with the same key replaces an earlier one. A pending
   * seed represents a Fetch with generation 0, so the first Fetch started
   * from a seeded Model has generation 1.
   */
  readonly seed: (
    entries: ReadonlyArray<
      Readonly<{ args: KeyedArgs<Fields>; data: AsyncData.AsyncData<A, E> }>
    >,
  ) => KeyedQueryModel<A, AI, E, EI, Fields>['Type']
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
  const OutMessage = makeKeyedQueryOutMessage(config.data, config.error, Args)
  type OutMessage = KeyedQueryOutMessage<A, AI, E, EI, Fields>['Type']

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
  type UpdateReturnWithOutMessage = Update.ReturnWithOutMessage<
    Model,
    Message,
    OutMessage
  >
  type DataWrite = KeyedDataWrite<Args, A>
  type DataTransform = KeyedDataTransform<Args, A>

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

  const updateWithOutMessage = (
    model: Model,
    message: Message,
  ): UpdateReturnWithOutMessage =>
    Message.match<UpdateReturnWithOutMessage>(message, {
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
          // NOTE: AcceptedFetch's constructor input view rejects args that are already the decoded Type.
          outMessage: { _tag: 'AcceptedFetch', args, result },
        }
      },
    })

  const update = (model: Model, message: Message): PureUpdateReturn => {
    const completion = updateWithOutMessage(model, message)

    return { model: completion.model }
  }

  const writeEntry = (
    model: Model,
    args: Args,
    data: EntryData,
  ): PureUpdateReturn => {
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
    }
  }

  const setData: Update.Fold<Model, Message, DataWrite> = Function.dual(
    2,
    (model: Model, { args, data }: DataWrite): PureUpdateReturn =>
      writeEntry(model, args, AsyncData.Success({ data })),
  )

  const updateData: Update.Fold<Model, Message, DataTransform> = Function.dual(
    2,
    (model: Model, { args, toNextData }: DataTransform): PureUpdateReturn =>
      Option.match(transformRetainedData(read(model, args), toNextData), {
        onNone: () => ({ model }),
        onSome: nextData => writeEntry(model, args, nextData),
      }),
  )

  const seed = (
    entries: ReadonlyArray<Readonly<{ args: Args; data: EntryData }>>,
  ): Model =>
    Model.make({
      entries: HashMap.fromIterable(
        Array.map(entries, ({ args, data }) => [
          argsToKey(args),
          { args, data, generation: 0 },
        ]),
      ),
      generation: 0,
    })

  const liftFold = <ParentModel, ParentMessage>(
    lens: FoldLens<ParentModel, ParentMessage, Model, Message>,
    foldOutMessage:
      | AnyFoldOutMessage<ParentMessage, Message, OutMessage>
      | undefined,
  ): Update.Fold<ParentModel, ParentMessage, Message, any> => {
    if (Predicate.isUndefined(foldOutMessage)) {
      return Update.foldChild({ update, ...lens })
    }

    return Update.foldChild({
      update: updateWithOutMessage,
      ...lens,
      foldOutMessage,
    })
  }

  const liftFromLens = <ParentModel, ParentMessage>(
    lens: FoldLens<ParentModel, ParentMessage, Model, Message>,
    foldOutMessage:
      | AnyFoldOutMessage<ParentMessage, Message, OutMessage>
      | undefined,
  ) => ({
    fold: liftFold(lens, foldOutMessage),
    setData: liftChildFold(setData, lens),
    updateData: liftChildFold(updateData, lens),
    reset: Update.foldChildStep({
      update: reset,
      ...lens,
    }),
    revalidate: liftChildFold(revalidate, lens),
    revalidateOrLoad: liftChildFold(revalidateOrLoad, lens),
    loadIfMissing: liftChildFold(loadIfMissing, lens),
  })

  function lift<ParentModel, ParentMessage, OutMessageRequirements = never>(
    config: ParentFieldConfig<ParentModel, ParentMessage, Model, Message> &
      FoldOutMessageConfig<
        ParentModel,
        ParentMessage,
        Message,
        OutMessage,
        OutMessageRequirements
      >,
  ): LiftedKeyedQuery<
    ParentModel,
    ParentMessage,
    Message,
    Args,
    A,
    R,
    OutMessageRequirements
  >
  function lift<ParentModel, ParentMessage, OutMessageRequirements = never>(
    config: FoldLens<ParentModel, ParentMessage, Model, Message> &
      FoldOutMessageConfig<
        ParentModel,
        ParentMessage,
        Message,
        OutMessage,
        OutMessageRequirements
      >,
  ): LiftedKeyedQuery<
    ParentModel,
    ParentMessage,
    Message,
    Args,
    A,
    R,
    OutMessageRequirements
  >
  function lift<ParentModel, ParentMessage, OutMessageRequirements = never>(
    config: LiftConfig<
      ParentModel,
      ParentMessage,
      Model,
      Message,
      OutMessage,
      OutMessageRequirements
    >,
  ) {
    if (isParentFieldConfig(config)) {
      return liftFromLens(parentFieldToLens(config), config.foldOutMessage)
    }

    return liftFromLens(
      {
        read: config.read,
        write: config.write,
        toParentMessage: config.toParentMessage,
      },
      config.foldOutMessage,
    )
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
    OutMessage,
    updateWithOutMessage,
    setData,
    updateData,
    seed,
  } satisfies KeyedQuery<Name, A, AI, E, EI, Fields, R>
}

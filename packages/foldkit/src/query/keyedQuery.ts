import {
  Array,
  Effect,
  Function,
  HashMap,
  Option,
  Record,
  Schema,
  pipe,
} from 'effect'

import * as AsyncData from '../asyncData/index.js'
import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import {
  type CacheStore,
  type CompletedFetchOf,
  type FoldLens,
  type KeyedArgs,
  type LiftConfig,
  type LiftKeyedQuery,
  type ParentKeyFoldConfig,
  type Policy,
  applyPolicy,
  foldChildFromPolicy,
  isParentKeyFoldConfig,
  parentKeyToLens,
  runExecute,
} from './internal.js'

export type SyncFields = {
  readonly [x: PropertyKey]: Schema.Codec<unknown, unknown, never, never>
}

const isArgKeyFields = <Args extends object>(
  keys: ReadonlyArray<string>,
): keys is Array.NonEmptyReadonlyArray<keyof Args & string> =>
  Array.isReadonlyArrayNonEmpty(keys)

export const encodeKey = <S extends Schema.Codec<unknown, unknown>>(
  schema: S,
) =>
  schema.pipe(
    Schema.toCodecJson,
    Schema.fromJsonString,
    Schema.encodeUnknownSync,
  )

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
    CompletedFetch: { args: Args, result: Schema.Result(data, error) },
  })

/** Schema-backed Message union dispatched when a keyed Fetch completes. */
export type KeyedQueryMessage<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryMessage<A, AI, E, EI, Fields>>

/** Schema for a KeyedQuery's retained slots. */
export function makeKeyedQueryModel<A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) {
  const states = AsyncData.Schema(data, error)
  return Schema.Struct({
    slots: Schema.HashMap(
      Schema.String,
      Schema.Struct({
        args: Args,
        data: states.schema,
      }),
    ),
  })
}

/** Schema for a KeyedQuery Model containing retained remote-data slots. */
export type KeyedQueryModel<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryModel<A, AI, E, EI, Fields>>

/** Keyed remote-data Submodel. Read a slot's `AsyncData` with `read`. */
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
  /** Command that executes the configured fetch for one set of arguments. */
  readonly Fetch: Command.CommandDefinitionWithArgs<
    `Fetch${Name}`,
    Fields,
    Effect.Effect<
      CompletedFetchOf<KeyedQueryMessage<A, AI, E, EI, Fields>>,
      never,
      R
    >
  >
  /** Creates a KeyedQuery Model with no slots. */
  readonly init: () => KeyedQueryModel<A, AI, E, EI, Fields>['Type']
  /** Reads one slot, returning `Idle` when that slot does not exist. */
  readonly read: (
    model: KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    args: KeyedArgs<Fields>,
  ) => AsyncData.AsyncData<A, E>
  /** Folds a keyed Fetch completion into the matching slot. */
  readonly update: (
    model: KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    message: KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
  ) => Update.Return<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    R
  >
  /** Refreshes a loaded slot and does nothing when it has no data. */
  readonly revalidate: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  /** Loads a missing slot or refreshes a loaded slot. */
  readonly revalidateOrLoad: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  /** Loads a slot only when it has no usable value. */
  readonly loadIfMissing: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  /** Lifts this KeyedQuery's update and policies into a parent Model. */
  readonly lift: LiftKeyedQuery<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  /** Executes one keyed fetch directly and returns settled AsyncData. */
  readonly run: (
    args: KeyedArgs<Fields>,
  ) => Effect.Effect<AsyncData.AsyncData<A, E>, never, R>
}

export namespace KeyedQuery {
  /** Any keyed Query definition. */
  export type Any = {
    readonly Model: Schema.Top
    readonly Message: Schema.Top
    readonly init: () => unknown
  }
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
  const states = AsyncData.Schema(config.data, config.error)
  type SlotState = typeof states.schema.Type
  const Args = Schema.Struct(config.args)
  type Args = typeof Args.Type
  const keys = Record.keys(config.args)
  if (!isArgKeyFields<Args>(keys)) {
    throw new Error(
      `Query.define("${config.name}"): keyed args must include at least one field`,
    )
  }

  const toKey = (args: Args): string =>
    config.toKey !== undefined ? config.toKey(args) : encodeKey(Args)(args)

  const Message = makeKeyedQueryMessage(config.data, config.error, Args)
  type Message = KeyedQueryMessage<A, AI, E, EI, Fields>['Type']

  const Fetch = Command.define(`Fetch${config.name}`, {
    args: config.args,
    messages: [Message.CompletedFetch],
    execute: (args: Args) =>
      pipe(
        config.execute(args),
        Effect.result,
        Effect.map((result): typeof Message.CompletedFetch.Type =>
          // NOTE: CompletedFetch's constructor input view rejects args that are already the decoded Type.
          ({
            _tag: 'CompletedFetch',
            args,
            result,
          }),
        ),
      ),
  })

  const Model = makeKeyedQueryModel(config.data, config.error, Args)
  type Model = KeyedQueryModel<A, AI, E, EI, Fields>['Type']
  type UpdateReturn = Update.Return<Model, Message, R>

  const store: CacheStore<Model, Args, A, E, Message, R> = {
    read: (model, args) =>
      AsyncData.fromOptionOrIdle(
        Option.map(HashMap.get(model.slots, toKey(args)), slot => slot.data),
      ),
    write: (model, args, data) =>
      modifyFields(model, {
        slots: HashMap.set(toKey(args), { args, data }),
      }),
    load: args => Fetch(args),
  }

  const hasSlot = (model: Model, args: Args): boolean =>
    HashMap.has(model.slots, toKey(args))

  const init = (): Model => ({ slots: HashMap.empty() })
  const read = (model: Model, args: Args): SlotState => store.read(model, args)

  const policy = (name: Policy): Update.Fold<Model, Message, Args, R> =>
    Function.dual(2, (model: Model, args: Args): UpdateReturn =>
      applyPolicy(store, model, args, name),
    )

  const revalidate = policy('revalidate')
  const revalidateOrLoad = policy('revalidateOrLoad')
  const loadIfMissing = policy('loadIfMissing')

  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      CompletedFetch({ args, result }) {
        if (!hasSlot(model, args)) return { model }

        return {
          model: store.write(
            model,
            args,
            AsyncData.settle(store.read(model, args), result),
          ),
        }
      },
    })

  const liftFromLens = <ParentModel, ParentMessage>(
    foldConfig: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ) => ({
    fold: Update.foldChild({ update, ...foldConfig }),
    revalidate: foldChildFromPolicy(revalidate, foldConfig),
    revalidateOrLoad: foldChildFromPolicy(revalidateOrLoad, foldConfig),
    loadIfMissing: foldChildFromPolicy(loadIfMissing, foldConfig),
  })

  function lift<ParentModel, ParentMessage>(
    config: ParentKeyFoldConfig<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<LiftKeyedQuery<Model, Message, Args, R>>
  function lift<ParentModel, ParentMessage>(
    config: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<LiftKeyedQuery<Model, Message, Args, R>>
  function lift<ParentModel, ParentMessage>(
    config: LiftConfig<ParentModel, ParentMessage, Model, Message>,
  ) {
    if (isParentKeyFoldConfig(config)) {
      return liftFromLens(parentKeyToLens(config))
    }

    return liftFromLens(config)
  }

  const run = (args: Args): Effect.Effect<SlotState, never, R> =>
    runExecute(config.execute(args))

  return {
    Model,
    Message,
    Fetch,
    init,
    read,
    update,
    revalidate,
    revalidateOrLoad,
    loadIfMissing,
    lift,
    run,
  } satisfies KeyedQuery<Name, A, AI, E, EI, Fields, R>
}

import {
  Array,
  Effect,
  Function,
  HashMap,
  HashSet,
  Option,
  Order,
  Record,
  Schema,
  Stream,
  pipe,
} from 'effect'

import * as AsyncData from '../asyncData/index.js'
import * as Command from '../command/index.js'
import type * as Interruptible from '../command/interruptible/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Update from '../update/index.js'
import {
  type CacheStore,
  CancelIntent,
  FetchInterruptOutcome,
  type FoldLens,
  type KeyedArgs,
  type LiftConfig,
  type LiftKeyedQuery,
  type ParentKeyFoldConfig,
  type ParentMessage,
  type SettledFetchOf,
  applyPolicy,
  asLift,
  completeCancel,
  foldChildFromInform,
  isParentKeyFoldConfig,
  parentKeyToLens,
  replaceSlot,
  runExecute,
} from './internal.js'

export type SyncFields = {
  readonly [x: PropertyKey]: Schema.Codec<unknown, unknown, never, never>
}

type InterruptKeyArgs<Fields extends SyncFields> = Pick<
  KeyedArgs<Fields>,
  keyof KeyedArgs<Fields> & string
>

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
    RequestedRevalidate: { args: Args },
    RequestedRevalidateOrLoad: { args: Args },
    RequestedLoadIfMissing: { args: Args },
    RequestedReplace: { args: Args },
    RequestedWatch: { live: Schema.HashMap(Schema.String, Args) },
    RequestedForget: { args: Args },
    SettledFetch: { args: Args, result: Schema.Result(data, error) },
    CompletedCancelFetch: {
      args: Args,
      outcome: FetchInterruptOutcome,
      intent: CancelIntent,
    },
  })

export type KeyedQueryMessage<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryMessage<A, AI, E, EI, Fields>>

export function makeKeyedQueryModel<A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) {
  const states = AsyncData.Schema(data, error)
  return Schema.HashMap(
    Schema.String,
    Schema.Struct({
      args: Args,
      data: states.schema,
    }),
  )
}

export type KeyedQueryModel<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryModel<A, AI, E, EI, Fields>>

/** KeyedQuery remote-data Submodel. `Model` is a `HashMap` of `{ args, data }` slots. */
export interface KeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  R = never,
> {
  readonly Model: KeyedQueryModel<A, AI, E, EI, Fields>
  readonly Message: KeyedQueryMessage<A, AI, E, EI, Fields>
  readonly ParentMessage: ParentMessage<KeyedQueryMessage<A, AI, E, EI, Fields>>
  readonly Fetch: Interruptible.DefinitionWithArgs<
    `Fetch${Name}`,
    Fields,
    InterruptKeyArgs<Fields>,
    Effect.Effect<
      SettledFetchOf<KeyedQueryMessage<A, AI, E, EI, Fields>>,
      never,
      R
    >
  >
  readonly init: () => KeyedQueryModel<A, AI, E, EI, Fields>['Type']
  readonly read: (
    model: KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    args: KeyedArgs<Fields>,
  ) => AsyncData.AsyncData<A, E>
  readonly update: (
    model: KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    message: KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
  ) => Update.Return<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    R
  >
  readonly informRevalidate: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  readonly informRevalidateOrLoad: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  readonly informLoadIfMissing: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  readonly informReplace: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  readonly informWatch: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    ReadonlyArray<KeyedArgs<Fields>>,
    R
  >
  readonly informForget: Update.Fold<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  readonly lift: LiftKeyedQuery<
    KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
    KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
    KeyedArgs<Fields>,
    R
  >
  readonly watchSubscription: <ParentModel, ParentMessage>(
    entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
    config: {
      readonly toParentMessage: (
        message: KeyedQueryMessage<A, AI, E, EI, Fields>['Type'],
      ) => ParentMessage
      readonly modelToArgs: (
        model: ParentModel,
      ) => ReadonlyArray<KeyedArgs<Fields>>
    },
  ) => Subscription.EntryWithoutKeepAlive<
    ParentModel,
    ParentMessage,
    { readonly args: ReadonlyArray<KeyedArgs<Fields>> },
    R
  >
  readonly run: (
    args: KeyedArgs<Fields>,
  ) => Effect.Effect<AsyncData.AsyncData<A, E>, never, R>
}

export namespace KeyedQuery {
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
    messages: [Message.SettledFetch],
    interrupt: {
      keyFields: keys,
      toKey(keyArgs: Pick<Args, keyof Args & string>) {
        Schema.asserts(Args, keyArgs)
        return toKey(keyArgs)
      },
    },
    execute: (args: Args) =>
      pipe(
        config.execute(args),
        Effect.result,
        Effect.map((result): typeof Message.SettledFetch.Type => ({
          _tag: 'SettledFetch',
          args,
          result,
        })),
      ),
  })

  const Model = makeKeyedQueryModel(config.data, config.error, Args)
  type Model = KeyedQueryModel<A, AI, E, EI, Fields>['Type']
  type UpdateReturn = Update.Return<Model, Message, R>
  type UpdateStep = Update.Step<Model, Message, R>

  const store: CacheStore<Model, Args, A, E, Message, R> = {
    read: (model, args) =>
      AsyncData.fromOptionOrIdle(
        Option.map(HashMap.get(model, toKey(args)), slot => slot.data),
      ),
    write: (model, args, data) =>
      HashMap.set(model, toKey(args), { args, data }),
    load: args => Fetch(args),
    interrupt: (args, intent) =>
      Fetch.Interrupt(args, function (outcome) {
        return {
          _tag: 'CompletedCancelFetch',
          args,
          outcome,
          intent,
        }
      }),
  }

  const hasSlot = (model: Model, args: Args): boolean =>
    HashMap.has(model, toKey(args))

  function forgetSlot(model: Model, args: Args): UpdateReturn {
    if (!hasSlot(model, args)) return { model }

    const nextModel = HashMap.remove(model, toKey(args))
    if (AsyncData.isPending(store.read(model, args)))
      return {
        model: nextModel,
        commands: [store.interrupt(args, CancelIntent.Forget())],
      }

    return { model: nextModel }
  }

  function watchSlots(
    model: Model,
    liveArgs: ReadonlyArray<Args>,
  ): UpdateReturn {
    const liveKeys = HashSet.fromIterable(
      Array.map(liveArgs, args => toKey(args)),
    )
    const forgetExtras = HashMap.reduce(
      model,
      Array.empty<UpdateStep>(),
      (steps, slot, key) =>
        HashSet.has(liveKeys, key)
          ? steps
          : Array.append(steps, (current: Model) =>
              forgetSlot(current, slot.args),
            ),
    )
    const loadLive = Array.map(
      liveArgs,
      (args): UpdateStep =>
        current =>
          applyPolicy(store, current, args, 'loadIfMissing'),
    )
    return Update.combine(model, Array.appendAll(forgetExtras, loadLive))
  }

  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      RequestedRevalidate: ({ args }) =>
        applyPolicy(store, model, args, 'revalidate'),
      RequestedRevalidateOrLoad: ({ args }) =>
        applyPolicy(store, model, args, 'revalidateOrLoad'),
      RequestedLoadIfMissing: ({ args }) =>
        applyPolicy(store, model, args, 'loadIfMissing'),
      RequestedReplace: ({ args }) => replaceSlot(store, model, args),
      RequestedWatch: ({ live }) => watchSlots(model, HashMap.toValues(live)),
      RequestedForget: ({ args }) => forgetSlot(model, args),
      SettledFetch({ args, result }) {
        if (!hasSlot(model, args)) return { model }

        return {
          model: store.write(
            model,
            args,
            AsyncData.settle(store.read(model, args), result),
          ),
        }
      },
      CompletedCancelFetch({ args, outcome, intent }) {
        if (!hasSlot(model, args)) return { model }

        return completeCancel(store, model, args, outcome, intent)
      },
    })

  const inform = (
    build: (args: Args) => Message,
  ): Update.Fold<Model, Message, Args, R> =>
    Function.dual(2, (model: Model, args: Args): UpdateReturn =>
      update(model, build(args)),
    )

  const informRevalidate = inform(function (args) {
    return { _tag: 'RequestedRevalidate', args }
  })
  const informRevalidateOrLoad = inform(function (args) {
    return { _tag: 'RequestedRevalidateOrLoad', args }
  })
  const informLoadIfMissing = inform(function (args) {
    return { _tag: 'RequestedLoadIfMissing', args }
  })
  const informReplace = inform(function (args) {
    return { _tag: 'RequestedReplace', args }
  })
  const informForget = inform(function (args) {
    return { _tag: 'RequestedForget', args }
  })
  const toWatchMessage = function (liveArgs: ReadonlyArray<Args>): Message {
    return {
      _tag: 'RequestedWatch',
      live: HashMap.fromIterable(
        Array.map(liveArgs, function (args) {
          return [toKey(args), args] as const
        }),
      ),
    }
  }
  const informWatch: Update.Fold<
    Model,
    Message,
    ReadonlyArray<Args>,
    R
  > = Function.dual(
    2,
    (model: Model, liveArgs: ReadonlyArray<Args>): UpdateReturn =>
      update(model, toWatchMessage(liveArgs)),
  )

  const init = (): Model => HashMap.empty()
  const read = (model: Model, args: Args): SlotState => store.read(model, args)

  const liftFromLens = <ParentModel, ParentMessage>(
    foldConfig: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ) => ({
    fold: asLift(Update.foldChild({ update, ...foldConfig })),
    revalidate: foldChildFromInform(informRevalidate, foldConfig),
    revalidateOrLoad: foldChildFromInform(informRevalidateOrLoad, foldConfig),
    loadIfMissing: foldChildFromInform(informLoadIfMissing, foldConfig),
    replace: foldChildFromInform(informReplace, foldConfig),
    watch: foldChildFromInform(informWatch, foldConfig),
    forget: foldChildFromInform(informForget, foldConfig),
    watchSubscription: (
      entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
      modelToArgs: (model: ParentModel) => ReadonlyArray<Args>,
    ) =>
      watchKeyedQuerySubscription(
        entry,
        foldConfig.toParentMessage,
        modelToArgs,
      ),
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
    if (isParentKeyFoldConfig(config))
      return liftFromLens(parentKeyToLens(config))

    return liftFromLens(config)
  }

  const watchKeyedQuerySubscription = <ParentModel, ParentMessage>(
    entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
    toParentMessage: (message: Message) => ParentMessage,
    modelToArgs: (model: ParentModel) => ReadonlyArray<Args>,
  ) =>
    entry(
      { args: Schema.Array(Args) },
      {
        modelToDependencies: (parent: ParentModel) => ({
          args: Array.sortWith(
            modelToArgs(parent),
            liveArgs => toKey(liveArgs),
            Order.String,
          ),
        }),
        dependenciesToStream: ({
          args,
        }: {
          readonly args: ReadonlyArray<Args>
        }) => Stream.succeed(toParentMessage(toWatchMessage(args))),
      },
    )

  const watchSubscription = <ParentModel, ParentMessage>(
    entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
    watchConfig: {
      readonly toParentMessage: (message: Message) => ParentMessage
      readonly modelToArgs: (model: ParentModel) => ReadonlyArray<Args>
    },
  ) =>
    watchKeyedQuerySubscription(
      entry,
      watchConfig.toParentMessage,
      watchConfig.modelToArgs,
    )

  const run = (args: Args): Effect.Effect<SlotState, never, R> =>
    runExecute(config.execute(args))

  return {
    Model,
    Message,
    ParentMessage: { message: Message },
    Fetch,
    init,
    read,
    update,
    informRevalidate,
    informRevalidateOrLoad,
    informLoadIfMissing,
    informReplace,
    informWatch,
    informForget,
    lift,
    watchSubscription,
    run,
  } satisfies KeyedQuery<Name, A, AI, E, EI, Fields, R>
}

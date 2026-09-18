import { Effect, Schema, Stream, pipe } from 'effect'

import * as AsyncData from '../asyncData/index.js'
import * as Command from '../command/index.js'
import * as Interruptible from '../command/interruptible/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Update from '../update/index.js'
import {
  type CacheStore,
  CancelIntent,
  FetchInterruptOutcome,
  type FoldLens,
  type LiftConfig,
  type LiftQuery,
  type ParentKeyFoldConfig,
  type ParentMessage,
  type SettledFetchOf,
  applyPolicy,
  asLift,
  completeCancel,
  isParentKeyFoldConfig,
  parentKeyToLens,
  replaceSlot,
  runExecute,
} from './internal.js'

export type QueryConfig<Name extends string, A, AI, E, EI, R> = Readonly<{
  name: Name
  data: Schema.Codec<A, AI, never, never>
  error: Schema.Codec<E, EI, never, never>
  execute: Effect.Effect<A, E, R>
}>

const makeQueryMessage = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) =>
  defineMessageUnion({
    RequestedRevalidate: {},
    RequestedRevalidateOrLoad: {},
    RequestedLoadIfMissing: {},
    RequestedReplace: {},
    RequestedWatch: {},
    RequestedForget: {},
    SettledFetch: { result: Schema.Result(data, error) },
    CompletedCancelFetch: {
      outcome: FetchInterruptOutcome,
      intent: CancelIntent,
    },
  })

export type QueryMessage<A, AI, E, EI> = ReturnType<
  typeof makeQueryMessage<A, AI, E, EI>
>

export type QueryModel<A, AI, E, EI> = AsyncData.AsyncDataSchema<
  A,
  AI,
  E,
  EI
>['schema']

/** Single-slot remote-data Submodel. `Model` is the `AsyncData` codec. */
export interface Query<Name extends string, A, AI, E, EI, R = never> {
  readonly Model: QueryModel<A, AI, E, EI>
  readonly Message: QueryMessage<A, AI, E, EI>
  readonly ParentMessage: ParentMessage<QueryMessage<A, AI, E, EI>>
  readonly Fetch: Interruptible.DefinitionNoArgs<
    `Fetch${Name}`,
    Effect.Effect<SettledFetchOf<QueryMessage<A, AI, E, EI>>, never, R>
  >
  readonly init: () => AsyncData.AsyncData<A, E>
  readonly update: (
    model: AsyncData.AsyncData<A, E>,
    message: QueryMessage<A, AI, E, EI>['Type'],
  ) => Update.Return<
    AsyncData.AsyncData<A, E>,
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  readonly informRevalidate: (
    model: AsyncData.AsyncData<A, E>,
  ) => Update.Return<
    AsyncData.AsyncData<A, E>,
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  readonly informRevalidateOrLoad: (
    model: AsyncData.AsyncData<A, E>,
  ) => Update.Return<
    AsyncData.AsyncData<A, E>,
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  readonly informLoadIfMissing: (
    model: AsyncData.AsyncData<A, E>,
  ) => Update.Return<
    AsyncData.AsyncData<A, E>,
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  readonly informReplace: (
    model: AsyncData.AsyncData<A, E>,
  ) => Update.Return<
    AsyncData.AsyncData<A, E>,
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  readonly informWatch: (
    model: AsyncData.AsyncData<A, E>,
  ) => Update.Return<
    AsyncData.AsyncData<A, E>,
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  readonly informForget: (
    model: AsyncData.AsyncData<A, E>,
  ) => Update.Return<
    AsyncData.AsyncData<A, E>,
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  readonly lift: LiftQuery<
    AsyncData.AsyncData<A, E>,
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  readonly watchSubscription: <ParentModel, ParentMessage>(
    entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
    config: {
      readonly toParentMessage: (
        message: QueryMessage<A, AI, E, EI>['Type'],
      ) => ParentMessage
      readonly modelToIsWatching: (model: ParentModel) => boolean
    },
  ) => Subscription.EntryWithoutKeepAlive<
    ParentModel,
    ParentMessage,
    { readonly isWatching: boolean },
    R
  >
  readonly run: Effect.Effect<AsyncData.AsyncData<A, E>, never, R>
}

export namespace Query {
  export type Any = {
    readonly Model: Schema.Top
    readonly Message: Schema.Top
    readonly init: () => unknown
  }
}

export function defineQuery<Name extends string, A, AI, E, EI, R>(
  config: QueryConfig<Name, A, AI, E, EI, R>,
): Query<Name, A, AI, E, EI, R> {
  const states = AsyncData.Schema(config.data, config.error)
  const Message = makeQueryMessage(config.data, config.error)
  type Message = QueryMessage<A, AI, E, EI>['Type']

  const Fetch = Command.define(`Fetch${config.name}`, {
    messages: [Message.SettledFetch],
    interrupt: true,
    execute: pipe(
      config.execute,
      Effect.result,
      Effect.map(result => Message.SettledFetch({ result })),
    ),
  })

  type Model = AsyncData.AsyncData<A, E>
  type Args = undefined
  type UpdateReturn = Update.Return<Model, Message, R>

  const store: CacheStore<Model, Args, A, E, Message, R> = {
    read: model => model,
    write: (_model, _args, data) => data,
    load: () => Fetch(),
    interrupt: function (_args, intent) {
      return Fetch.Interrupt(function (outcome) {
        return Message.CompletedCancelFetch({ outcome, intent })
      })
    },
  }

  const hasSlot = (model: Model): boolean => !AsyncData.isIdle(model)

  function forgetSlot(model: Model): UpdateReturn {
    if (AsyncData.isIdle(model)) return { model }

    if (AsyncData.isPending(model))
      return {
        model: AsyncData.Idle(),
        commands: [store.interrupt(undefined, CancelIntent.Forget())],
      }

    return { model: AsyncData.Idle() }
  }

  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      RequestedRevalidate: () =>
        applyPolicy(store, model, undefined, 'revalidate'),
      RequestedRevalidateOrLoad: () =>
        applyPolicy(store, model, undefined, 'revalidateOrLoad'),
      RequestedLoadIfMissing: () =>
        applyPolicy(store, model, undefined, 'loadIfMissing'),
      RequestedReplace: () => replaceSlot(store, model, undefined),
      RequestedWatch: () =>
        applyPolicy(store, model, undefined, 'loadIfMissing'),
      RequestedForget: () => forgetSlot(model),
      SettledFetch({ result }) {
        if (!hasSlot(model)) return { model }

        return {
          model: store.write(
            model,
            undefined,
            AsyncData.settle(store.read(model, undefined), result),
          ),
        }
      },
      CompletedCancelFetch({ outcome, intent }) {
        if (!hasSlot(model)) return { model }

        return completeCancel(store, model, undefined, outcome, intent)
      },
    })

  const informRevalidate = (model: Model): UpdateReturn =>
    update(model, Message.RequestedRevalidate())
  const informRevalidateOrLoad = (model: Model): UpdateReturn =>
    update(model, Message.RequestedRevalidateOrLoad())
  const informLoadIfMissing = (model: Model): UpdateReturn =>
    update(model, Message.RequestedLoadIfMissing())
  const informReplace = (model: Model): UpdateReturn =>
    update(model, Message.RequestedReplace())
  const informWatch = (model: Model): UpdateReturn =>
    update(model, Message.RequestedWatch())
  const informForget = (model: Model): UpdateReturn =>
    update(model, Message.RequestedForget())

  const init = (): Model => AsyncData.Idle()

  const watchQuerySubscription = <ParentModel, ParentMessage>(
    entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
    toParentMessage: (message: Message) => ParentMessage,
    modelToIsWatching: (model: ParentModel) => boolean,
  ) =>
    entry(
      { isWatching: Schema.Boolean },
      {
        modelToDependencies: (parent: ParentModel) => ({
          isWatching: modelToIsWatching(parent),
        }),
        dependenciesToStream: ({
          isWatching,
        }: {
          readonly isWatching: boolean
        }) =>
          Stream.succeed(
            toParentMessage(
              isWatching ? Message.RequestedWatch() : Message.RequestedForget(),
            ),
          ),
      },
    )

  const liftFromLens = <ParentModel, ParentMessage>(
    foldConfig: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ) => ({
    fold: asLift(Update.foldChild({ update, ...foldConfig })),
    revalidate: Update.foldChildStep({
      update: informRevalidate,
      ...foldConfig,
    }),
    revalidateOrLoad: Update.foldChildStep({
      update: informRevalidateOrLoad,
      ...foldConfig,
    }),
    loadIfMissing: Update.foldChildStep({
      update: informLoadIfMissing,
      ...foldConfig,
    }),
    replace: Update.foldChildStep({ update: informReplace, ...foldConfig }),
    watch: Update.foldChildStep({ update: informWatch, ...foldConfig }),
    forget: Update.foldChildStep({ update: informForget, ...foldConfig }),
    watchSubscription: (
      entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
      modelToIsWatching: (model: ParentModel) => boolean,
    ) =>
      watchQuerySubscription(
        entry,
        foldConfig.toParentMessage,
        modelToIsWatching,
      ),
  })

  function lift<ParentModel, ParentMessage>(
    config: ParentKeyFoldConfig<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<LiftQuery<Model, Message, R>>
  function lift<ParentModel, ParentMessage>(
    config: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<LiftQuery<Model, Message, R>>
  function lift<ParentModel, ParentMessage>(
    config: LiftConfig<ParentModel, ParentMessage, Model, Message>,
  ) {
    if (isParentKeyFoldConfig(config)) {
      return liftFromLens(parentKeyToLens(config))
    }

    return liftFromLens(config)
  }

  const watchSubscription = <ParentModel, ParentMessage>(
    entry: Subscription.EntryBuilder<ParentModel, ParentMessage, R>,
    watchConfig: {
      readonly toParentMessage: (message: Message) => ParentMessage
      readonly modelToIsWatching: (model: ParentModel) => boolean
    },
  ) =>
    watchQuerySubscription(
      entry,
      watchConfig.toParentMessage,
      watchConfig.modelToIsWatching,
    )

  const run = runExecute(config.execute)

  return {
    Model: states.schema,
    Message,
    ParentMessage: { message: Message },
    Fetch,
    init,
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
  } satisfies Query<Name, A, AI, E, EI, R>
}

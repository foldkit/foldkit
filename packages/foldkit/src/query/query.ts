import { Effect, Schema, pipe } from 'effect'

import * as AsyncData from '../asyncData/index.js'
import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Update from '../update/index.js'
import {
  type CacheStore,
  type FoldLens,
  type LiftConfig,
  type LiftQuery,
  type ParentKeyFoldConfig,
  type SettledFetchOf,
  applyPolicy,
  isParentKeyFoldConfig,
  parentKeyToLens,
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
    SettledFetch: { result: Schema.Result(data, error) },
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
  readonly Fetch: Command.CommandDefinitionNoArgs<
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
  readonly lift: LiftQuery<
    AsyncData.AsyncData<A, E>,
    QueryMessage<A, AI, E, EI>['Type'],
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
  }

  const hasSlot = (model: Model): boolean => !AsyncData.isIdle(model)

  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      RequestedRevalidate: () =>
        applyPolicy(store, model, undefined, 'revalidate'),
      RequestedRevalidateOrLoad: () =>
        applyPolicy(store, model, undefined, 'revalidateOrLoad'),
      RequestedLoadIfMissing: () =>
        applyPolicy(store, model, undefined, 'loadIfMissing'),
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
    })

  const informRevalidate = (model: Model): UpdateReturn =>
    update(model, Message.RequestedRevalidate())
  const informRevalidateOrLoad = (model: Model): UpdateReturn =>
    update(model, Message.RequestedRevalidateOrLoad())
  const informLoadIfMissing = (model: Model): UpdateReturn =>
    update(model, Message.RequestedLoadIfMissing())

  const init = (): Model => AsyncData.Idle()

  const liftFromLens = <ParentModel, ParentMessage>(
    foldConfig: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ) => ({
    fold: Update.foldChild({ update, ...foldConfig }),
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

  const run = runExecute(config.execute)

  return {
    Model: states.schema,
    Message,
    Fetch,
    init,
    update,
    informRevalidate,
    informRevalidateOrLoad,
    informLoadIfMissing,
    lift,
    run,
  } satisfies Query<Name, A, AI, E, EI, R>
}

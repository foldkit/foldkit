import { Effect, Schema, pipe } from 'effect'

import * as AsyncData from '../asyncData/index.js'
import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import {
  type CacheStore,
  type CompletedFetchOf,
  type FoldLens,
  type LiftConfig,
  type LiftQuery,
  type ParentKeyFoldConfig,
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
    CompletedFetch: { result: Schema.Result(data, error) },
  })

/** Schema-backed Message union dispatched when a Query Fetch completes. */
export type QueryMessage<A, AI, E, EI> = ReturnType<
  typeof makeQueryMessage<A, AI, E, EI>
>

/** Schema for a single Query's remote data. */
export const makeQueryModel = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) => Schema.Struct({ data: AsyncData.Schema(data, error).schema })

/** Schema for a Query Model containing one remote-data value. */
export type QueryModel<A, AI, E, EI> = ReturnType<
  typeof makeQueryModel<A, AI, E, EI>
>

/** Single-slot remote-data Submodel. Read its `AsyncData` with `read`. */
export interface Query<Name extends string, A, AI, E, EI, R = never> {
  /** Schema for this Query's Model. */
  readonly Model: QueryModel<A, AI, E, EI>
  /** Schema-backed union of Messages handled by this Query. */
  readonly Message: QueryMessage<A, AI, E, EI>
  /** Command that executes the configured fetch. */
  readonly Fetch: Command.CommandDefinitionNoArgs<
    `Fetch${Name}`,
    Effect.Effect<CompletedFetchOf<QueryMessage<A, AI, E, EI>>, never, R>
  >
  /** Creates a Query Model whose data is `Idle`. */
  readonly init: () => QueryModel<A, AI, E, EI>['Type']
  /** Reads the remote-data value from the Query Model. */
  readonly read: (
    model: QueryModel<A, AI, E, EI>['Type'],
  ) => AsyncData.AsyncData<A, E>
  /** Folds a Fetch completion into the Query Model. */
  readonly update: (
    model: QueryModel<A, AI, E, EI>['Type'],
    message: QueryMessage<A, AI, E, EI>['Type'],
  ) => Update.Return<
    QueryModel<A, AI, E, EI>['Type'],
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  /** Refreshes loaded data and does nothing when no data is present. */
  readonly revalidate: (
    model: QueryModel<A, AI, E, EI>['Type'],
  ) => Update.Return<
    QueryModel<A, AI, E, EI>['Type'],
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  /** Loads missing data or refreshes loaded data. */
  readonly revalidateOrLoad: (
    model: QueryModel<A, AI, E, EI>['Type'],
  ) => Update.Return<
    QueryModel<A, AI, E, EI>['Type'],
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  /** Loads data only when the Query has no usable value. */
  readonly loadIfMissing: (
    model: QueryModel<A, AI, E, EI>['Type'],
  ) => Update.Return<
    QueryModel<A, AI, E, EI>['Type'],
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  /** Lifts this Query's update and loading policies into a parent Model. */
  readonly lift: LiftQuery<
    QueryModel<A, AI, E, EI>['Type'],
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  /** Executes the configured fetch directly and returns settled AsyncData. */
  readonly run: Effect.Effect<AsyncData.AsyncData<A, E>, never, R>
}

export namespace Query {
  /** Any non-keyed Query definition. */
  export type Any = {
    readonly Model: Schema.Top
    readonly Message: Schema.Top
    readonly init: () => unknown
  }
}

export function defineQuery<Name extends string, A, AI, E, EI, R>(
  config: QueryConfig<Name, A, AI, E, EI, R>,
): Query<Name, A, AI, E, EI, R> {
  const Model = makeQueryModel(config.data, config.error)
  const Message = makeQueryMessage(config.data, config.error)
  type Message = QueryMessage<A, AI, E, EI>['Type']

  const Fetch = Command.define(`Fetch${config.name}`, {
    messages: [Message.CompletedFetch],
    execute: pipe(
      config.execute,
      Effect.result,
      Effect.map(result => Message.CompletedFetch({ result })),
    ),
  })

  type Model = typeof Model.Type
  type UpdateReturn = Update.Return<Model, Message, R>

  const store: CacheStore<Model, undefined, A, E, Message, R> = {
    read: model => model.data,
    write: (model, _args, data) => modifyFields(model, { data: () => data }),
    load: () => Fetch(),
  }

  const init = (): Model => ({ data: AsyncData.Idle() })
  const read = (model: Model): AsyncData.AsyncData<A, E> => model.data

  const revalidate = (model: Model): UpdateReturn =>
    applyPolicy(store, model, undefined, 'revalidate')
  const revalidateOrLoad = (model: Model): UpdateReturn =>
    applyPolicy(store, model, undefined, 'revalidateOrLoad')
  const loadIfMissing = (model: Model): UpdateReturn =>
    applyPolicy(store, model, undefined, 'loadIfMissing')

  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      CompletedFetch({ result }) {
        if (AsyncData.isIdle(read(model))) return { model }

        return {
          model: store.write(
            model,
            undefined,
            AsyncData.settle(read(model), result),
          ),
        }
      },
    })

  const liftFromLens = <ParentModel, ParentMessage>(
    foldConfig: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ) => ({
    fold: Update.foldChild({ update, ...foldConfig }),
    revalidate: Update.foldChildStep({
      update: revalidate,
      ...foldConfig,
    }),
    revalidateOrLoad: Update.foldChildStep({
      update: revalidateOrLoad,
      ...foldConfig,
    }),
    loadIfMissing: Update.foldChildStep({
      update: loadIfMissing,
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
  } satisfies Query<Name, A, AI, E, EI, R>
}

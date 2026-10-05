import { Effect, Number, Schema, pipe } from 'effect'

import * as AsyncData from '../../asyncData/index.js'
import * as Command from '../../command/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import {
  type CompletedFetchOf,
  type FoldLens,
  type LiftConfig,
  type LiftQuery,
  type ParentFieldConfig,
  type QueryStore,
  applyTransition,
  isParentFieldConfig,
  parentFieldToLens,
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
    CompletedFetch: {
      generation: Schema.Number,
      result: Schema.Result(data, error),
    },
  })

/**
 * Schema-backed Message union dispatched when a Query Fetch completes.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type QueryMessage<A, AI, E, EI> = ReturnType<
  typeof makeQueryMessage<A, AI, E, EI>
>

/** Builds the Model Schema for a Query. */
export const makeQueryModel = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) =>
  Schema.Struct({
    data: AsyncData.Schema(data, error).schema,
    generation: Schema.Number,
  })

/**
 * Model Schema for a Query containing one `AsyncData` value.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type QueryModel<A, AI, E, EI> = ReturnType<
  typeof makeQueryModel<A, AI, E, EI>
>

/**
 * Submodel for fetching and retaining one `AsyncData` value.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export interface Query<Name extends string, A, AI, E, EI, R = never> {
  /** Schema for this Query's Model. */
  readonly Model: QueryModel<A, AI, E, EI>
  /** Schema-backed union of Messages handled by this Query. */
  readonly Message: QueryMessage<A, AI, E, EI>
  /**
   * Command definition for matching this Query's pending fetch in Story and
   * Scene tests. Start fetches through a loading operation so the Model and
   * request generation advance together; do not call this directly.
   */
  readonly Fetch: Command.CommandDefinitionWithArgs<
    `Fetch${Name}`,
    { readonly generation: typeof Schema.Number },
    Effect.Effect<CompletedFetchOf<QueryMessage<A, AI, E, EI>>, never, R>
  >
  /**
   * Creates a Query Model for initial parent Model construction. Never replace
   * a live Query with `init()`: it can reuse an in-flight request generation.
   * Use `reset` instead.
   */
  readonly init: () => QueryModel<A, AI, E, EI>['Type']
  /** Clears the Query while preserving its request identity. */
  readonly reset: (
    model: QueryModel<A, AI, E, EI>['Type'],
  ) => Update.Return<
    QueryModel<A, AI, E, EI>['Type'],
    QueryMessage<A, AI, E, EI>['Type']
  >
  /** Reads the `AsyncData` value from the Query Model. */
  readonly read: (
    model: QueryModel<A, AI, E, EI>['Type'],
  ) => AsyncData.AsyncData<A, E>
  /** Folds a Fetch completion into the Query Model. */
  readonly update: (
    model: QueryModel<A, AI, E, EI>['Type'],
    message: QueryMessage<A, AI, E, EI>['Type'],
  ) => Update.Return<
    QueryModel<A, AI, E, EI>['Type'],
    QueryMessage<A, AI, E, EI>['Type']
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
  /** Lifts this Query's update and loading operations into a parent Model. */
  readonly lift: LiftQuery<
    QueryModel<A, AI, E, EI>['Type'],
    QueryMessage<A, AI, E, EI>['Type'],
    R
  >
  /** Executes the configured fetch directly and returns settled `AsyncData`. */
  readonly run: Effect.Effect<AsyncData.AsyncData<A, E>, never, R>
}

export function defineQuery<Name extends string, A, AI, E, EI, R>(
  config: QueryConfig<Name, A, AI, E, EI, R>,
): Query<Name, A, AI, E, EI, R> {
  const Model = makeQueryModel(config.data, config.error)
  const Message = makeQueryMessage(config.data, config.error)
  type Message = QueryMessage<A, AI, E, EI>['Type']

  const Fetch = Command.define(`Fetch${config.name}`, {
    args: { generation: Schema.Number },
    messages: [Message.CompletedFetch],
    execute: ({ generation }) =>
      pipe(
        config.execute,
        Effect.result,
        Effect.map(result => Message.CompletedFetch({ generation, result })),
      ),
  })

  type Model = typeof Model.Type
  type UpdateReturn = Update.Return<Model, Message, R>
  type PureUpdateReturn = Update.Return<Model, Message>

  const store: QueryStore<Model, undefined, A, E, Message, R> = {
    read: model => model.data,
    start: (model, _args, data) => {
      const nextGeneration = Number.increment(model.generation)

      return {
        model: modifyFields(model, {
          data: () => data,
          generation: () => nextGeneration,
        }),
        generation: nextGeneration,
      }
    },
    fetch: (_args, generation) => Fetch({ generation }),
  }

  const init = (): Model =>
    Model.make({ data: AsyncData.Idle(), generation: 0 })
  const reset = (model: Model): PureUpdateReturn => ({
    model: modifyFields(model, { data: () => AsyncData.Idle() }),
  })
  const read = (model: Model): AsyncData.AsyncData<A, E> => model.data

  const revalidate = (model: Model): UpdateReturn =>
    applyTransition(store, model, undefined, AsyncData.revalidate)
  const revalidateOrLoad = (model: Model): UpdateReturn =>
    applyTransition(store, model, undefined, AsyncData.revalidateOrLoad)
  const loadIfMissing = (model: Model): UpdateReturn =>
    applyTransition(store, model, undefined, AsyncData.loadIfMissing)

  const update = (model: Model, message: Message): PureUpdateReturn =>
    Message.match<PureUpdateReturn>(message, {
      CompletedFetch({ generation, result }) {
        const data = read(model)

        if (!AsyncData.isPending(data) || generation !== model.generation) {
          return { model }
        }

        return {
          model: modifyFields(model, {
            data: () => AsyncData.settle(data, result),
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
    revalidate: Update.foldChildStep({
      update: revalidate,
      ...lens,
    }),
    revalidateOrLoad: Update.foldChildStep({
      update: revalidateOrLoad,
      ...lens,
    }),
    loadIfMissing: Update.foldChildStep({
      update: loadIfMissing,
      ...lens,
    }),
  })

  function lift<ParentModel, ParentMessage>(
    config: ParentFieldConfig<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<LiftQuery<Model, Message, R>>
  function lift<ParentModel, ParentMessage>(
    config: FoldLens<ParentModel, ParentMessage, Model, Message>,
  ): ReturnType<LiftQuery<Model, Message, R>>
  function lift<ParentModel, ParentMessage>(
    config: LiftConfig<ParentModel, ParentMessage, Model, Message>,
  ) {
    if (isParentFieldConfig(config)) {
      return liftFromLens(parentFieldToLens(config))
    }

    return liftFromLens(config)
  }

  const run = runExecute(config.execute)

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
  } satisfies Query<Name, A, AI, E, EI, R>
}

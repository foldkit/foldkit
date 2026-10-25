import { Effect, Layer, Number, Schema, type Scope, pipe } from 'effect'

import * as AsyncData from '../../asyncData/index.js'
import * as Block from '../../block/public.js'
import type { ValidateConstructionRequirements } from '../../block/scope.js'
import * as Command from '../../command/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import {
  type CompletedFetchOf,
  type QueryStore,
  applyTransition,
} from './internal.js'

type AnyLayer =
  | Layer.Layer<never, unknown, unknown>
  | Layer.Layer<unknown, unknown, unknown>

/** Schemas and identity used to define an unkeyed Query. */
export type QueryConfig<Name extends string, A, AI, E, EI> = Readonly<{
  /** Block identity and prefix for the Query's Fetch Command. */
  name: Name
  /** Schema for successfully fetched data. */
  data: Schema.Codec<A, AI, never, never>
  /** Schema for expected fetch failures retained in AsyncData. */
  error: Schema.Codec<E, EI, never, never>
  execute?: never
}>

type QueryFetchArgs = Readonly<{ generation: number }>

type QueryFetchHandler<Name extends string, A, AI, E, EI> = Command.Handler<
  `${Name}/Fetch`,
  QueryFetchArgs,
  CompletedFetchOf<QueryMessage<A, AI, E, EI>>
>

type QueryFetchDefinition<
  Name extends string,
  A,
  AI,
  E,
  EI,
> = Command.CommandDefinitionWithArgs<
  `${Name}/Fetch`,
  { readonly generation: typeof Schema.Number },
  Effect.Effect<
    CompletedFetchOf<QueryMessage<A, AI, E, EI>>,
    never,
    QueryFetchHandler<Name, A, AI, E, EI>
  >
> &
  Readonly<{
    toLayer: Command.ToLayer<
      `${Name}/Fetch`,
      QueryFetchArgs,
      CompletedFetchOf<QueryMessage<A, AI, E, EI>>
    >
  }>

/** Builds a Query fetch handler Layer from an Effect that constructs a fetch. */
export interface QueryToLayer<Name extends string, A, AI, E, EI> {
  <R, BuildE = never, BuildR = never>(
    build: Effect.Effect<() => Effect.Effect<A, E, R>, BuildE, BuildR> &
      ValidateConstructionRequirements<BuildR>,
  ): Layer.Layer<
    QueryFetchHandler<Name, A, AI, E, EI>,
    BuildE,
    Exclude<R | BuildR, Scope.Scope>
  >
}

const makeQueryMessage = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) =>
  defineMessageUnion({
    RequestedReset: {},
    RequestedRevalidation: {},
    RequestedRevalidationOrLoad: {},
    RequestedLoadIfMissing: {},
    CompletedFetch: {
      generation: Schema.Number,
      result: Schema.Result(data, error),
    },
  })

/**
 * Schema-backed Message union for requested Query operations and Fetch completions.
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

const makeQueryApi = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fetch extends QueryFetchDefinition<Name, A, AI, E, EI>,
>(
  _config: QueryConfig<Name, A, AI, E, EI>,
  Model: QueryModel<A, AI, E, EI>,
  Message: QueryMessage<A, AI, E, EI>,
  Fetch: Fetch,
) => {
  type Model = typeof Model.Type
  type Message = typeof Message.Type
  type UpdateReturn = Update.Return<
    Model,
    Message,
    QueryFetchHandler<Name, A, AI, E, EI>
  >
  type PureUpdateReturn = Update.Return<Model, Message>

  const store: QueryStore<
    Model,
    undefined,
    A,
    E,
    Message,
    QueryFetchHandler<Name, A, AI, E, EI>
  > = {
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

  const init = () => ({
    model: Model.make({ data: AsyncData.Idle(), generation: 0 }),
  })
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
  const updateHandlers = {
    RequestedReset: (model: Model) => reset(model),
    RequestedRevalidation: (model: Model) => revalidate(model),
    RequestedRevalidationOrLoad: (model: Model) => revalidateOrLoad(model),
    RequestedLoadIfMissing: (model: Model) => loadIfMissing(model),
    CompletedFetch(
      model: Model,
      { generation, result }: typeof Message.CompletedFetch.Type,
    ): UpdateReturn {
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
  }
  const run = pipe(
    Fetch({ generation: 0 }).effect,
    Effect.map(({ result }) => AsyncData.settle(AsyncData.Loading(), result)),
  )
  const toLayer: QueryToLayer<Name, A, AI, E, EI> = <
    HandlerR,
    BuildE = never,
    BuildR = never,
  >(
    build: Effect.Effect<() => Effect.Effect<A, E, HandlerR>, BuildE, BuildR> &
      ValidateConstructionRequirements<BuildR>,
  ) =>
    Fetch.toLayer<HandlerR, BuildE, BuildR>(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Effect.map(
        build,
        execute =>
          ({ generation }: QueryFetchArgs) =>
            pipe(
              execute(),
              Effect.result,
              Effect.map(result =>
                Message.CompletedFetch({ generation, result }),
              ),
            ),
      ) as never,
    )

  return {
    init,
    reset,
    read,
    updateHandlers,
    revalidate,
    revalidateOrLoad,
    loadIfMissing,
    run,
    toLayer,
  }
}

// oxlint-disable effecttsgo/any-unknown-in-error-context
const enrichQuery = <
  BlockValue extends Block.AnyBlock,
  Fetch,
  Read,
  Run,
  ToLayer,
  Operations extends Readonly<
    Record<string, (...args: ReadonlyArray<any>) => any>
  >,
>(
  block: BlockValue,
  api: Readonly<{
    Fetch: Fetch
    read: Read
    run: Run
    toLayer: ToLayer
    operations: Operations
  }>,
) => {
  const { replaceEffectsLayer, provideHandlers } = block

  return Object.assign(block, {
    Fetch: api.Fetch,
    read: api.read,
    run: api.run,
    toLayer: api.toLayer,
    ...api.operations,
    replaceEffectsLayer: <EffectsLayer extends AnyLayer>(
      EffectsLayer: EffectsLayer,
    ) => enrichQuery(replaceEffectsLayer(EffectsLayer), api),
    provideHandlers: <HandlersLayer extends AnyLayer>(
      HandlersLayer: HandlersLayer,
    ) => enrichQuery(provideHandlers(HandlersLayer), api),
  })
}
// oxlint-enable effecttsgo/any-unknown-in-error-context

type QueryModelType<A, AI, E, EI> = QueryModel<A, AI, E, EI>['Type']
type QueryMessageType<A, AI, E, EI> = QueryMessage<A, AI, E, EI>['Type']

type QueryExposedOperations<Name extends string, A, AI, E, EI> = Readonly<{
  /** Returns the Query to Idle without starting a fetch. */
  requestReset: Update.Step<
    QueryModelType<A, AI, E, EI>,
    QueryMessageType<A, AI, E, EI>,
    QueryFetchHandler<Name, A, AI, E, EI>
  >
  /** Starts a fetch for `Success` or `Stale` data while retaining that data.
   * Other states remain unchanged. */
  requestRevalidation: Update.Step<
    QueryModelType<A, AI, E, EI>,
    QueryMessageType<A, AI, E, EI>,
    QueryFetchHandler<Name, A, AI, E, EI>
  >
  /** Revalidates retained data and starts an initial or retry fetch when no
   * successful data is available. */
  requestRevalidationOrLoad: Update.Step<
    QueryModelType<A, AI, E, EI>,
    QueryMessageType<A, AI, E, EI>,
    QueryFetchHandler<Name, A, AI, E, EI>
  >
  /** Starts a fetch while the Query is `Idle` or `Failure`. Loaded and pending
   * states remain unchanged. */
  requestLoadIfMissing: Update.Step<
    QueryModelType<A, AI, E, EI>,
    QueryMessageType<A, AI, E, EI>,
    QueryFetchHandler<Name, A, AI, E, EI>
  >
}>

type QueryImplementation<
  Name extends string,
  A,
  AI,
  E,
  EI,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
> = Readonly<{
  init: () => Readonly<{ model: QueryModelType<A, AI, E, EI> }>
  update: (
    model: QueryModelType<A, AI, E, EI>,
    message: QueryMessageType<A, AI, E, EI>,
  ) => Update.Return<
    QueryModelType<A, AI, E, EI>,
    QueryMessageType<A, AI, E, EI>,
    QueryFetchHandler<Name, A, AI, E, EI>
  >
  operations: QueryExposedOperations<Name, A, AI, E, EI>
  EffectsLayer: EffectsLayer
  hostHandlers: HostHandlers
}>

type QueryConveniences<Name extends string, A, AI, E, EI> = Readonly<{
  /** Fetch Command definition owned by this Query Block. */
  Fetch: QueryFetchDefinition<Name, A, AI, E, EI>
  /** Reads the retained AsyncData without exposing the Query Model shape. */
  read: (model: QueryModelType<A, AI, E, EI>) => AsyncData.AsyncData<A, E>
  /** Runs the Query's fetch handler directly and returns settled AsyncData. */
  run: Effect.Effect<
    AsyncData.AsyncData<A, E>,
    never,
    QueryFetchHandler<Name, A, AI, E, EI>
  >
  /** Builds a handler Layer from an Effect that constructs the fetch function. */
  toLayer: QueryToLayer<Name, A, AI, E, EI>
}> &
  QueryExposedOperations<Name, A, AI, E, EI>

type MergeLayers<Left extends AnyLayer, Right extends AnyLayer> = Layer.Layer<
  Layer.Success<Left | Right>,
  Layer.Error<Left | Right>,
  Layer.Services<Left | Right>
>

type QueryBlockBase<
  Name extends string,
  A,
  AI,
  E,
  EI,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
> = Block.Block<
  Block.Owner<Name, false>,
  QueryModel<A, AI, E, EI>,
  QueryMessage<A, AI, E, EI>,
  undefined,
  readonly [],
  readonly [],
  QueryImplementation<Name, A, AI, E, EI, EffectsLayer, HostHandlers>
>

/**
 * Viewless Block for fetching and retaining one `AsyncData` value.
 *
 * The final two parameters describe the Query's Effects Layer and unresolved
 * host handlers. Their defaults describe a host-provided Query.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type Query<
  Name extends string,
  A,
  AI,
  E,
  EI,
  EffectsLayer extends AnyLayer = Layer.Layer<never, never, never>,
  HostHandlers extends ReadonlyArray<unknown> = readonly [
    QueryFetchDefinition<Name, A, AI, E, EI>,
  ],
> = Omit<
  QueryBlockBase<Name, A, AI, E, EI, EffectsLayer, HostHandlers>,
  'replaceEffectsLayer' | 'provideHandlers'
> &
  QueryConveniences<Name, A, AI, E, EI> &
  Readonly<{
    /** Replaces the Query's complete local fetch handler recipe. */
    replaceEffectsLayer: <SelectedEffectsLayer extends AnyLayer>(
      EffectsLayer: SelectedEffectsLayer &
        NoInfer<
          Block.ValidateConcreteComposition<
            QueryBlockBase<
              Name,
              A,
              AI,
              E,
              EI,
              SelectedEffectsLayer,
              HostHandlers
            >
          >
        >,
    ) => Query<Name, A, AI, E, EI, SelectedEffectsLayer, HostHandlers>
    /** Supplies the host-provided Fetch handler and returns a complete Query. */
    provideHandlers: HostHandlers extends readonly [
      QueryFetchDefinition<Name, A, AI, E, EI>,
    ]
      ? <HandlerError, HandlerRequirements>(
          HandlersLayer: Layer.Layer<
            QueryFetchHandler<Name, A, AI, E, EI>,
            HandlerError,
            HandlerRequirements
          >,
        ) => Query<
          Name,
          A,
          AI,
          E,
          EI,
          MergeLayers<
            EffectsLayer,
            Layer.Layer<
              QueryFetchHandler<Name, A, AI, E, EI>,
              HandlerError,
              HandlerRequirements
            >
          >,
          readonly []
        >
      : never
  }>

const makeHostQuery = <Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI>,
): Query<Name, A, AI, E, EI> => {
  const Model = makeQueryModel(config.data, config.error)
  const Message = makeQueryMessage(config.data, config.error)
  const QueryNamespace = Block.makeNamespace(config.name)
  const QueryDefinition = QueryNamespace.makeDefinition({
    Model,
    Message,
  })
  const Fetch = QueryDefinition.makeCommand('Fetch', {
    args: { generation: Schema.Number },
    messages: [Message.CompletedFetch],
  })
  const api = makeQueryApi(config, Model, Message, Fetch)
  const QueryComposition = QueryDefinition.makeComposition()
  const init = QueryComposition.makeInit(api.init)
  const prepare = () =>
    QueryComposition.prepareBlock({
      init,
      update: QueryComposition.makeUpdate(api.updateHandlers),
      operations: {
        requestReset: Message.RequestedReset,
        requestRevalidation: Message.RequestedRevalidation,
        requestRevalidationOrLoad: Message.RequestedRevalidationOrLoad,
        requestLoadIfMissing: Message.RequestedLoadIfMissing,
      },
      EffectsLayer: Layer.empty,
      hostHandlers: [Fetch],
    })
  const block: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)

  return enrichQuery(block, {
    Fetch,
    read: api.read,
    run: api.run,
    toLayer: api.toLayer,
    operations: block.operations,
  })
}

const makeCanonicalQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
>(
  config: QueryConfig<Name, A, AI, E, EI>,
  handler: Effect.Effect<
    () => Effect.Effect<A, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
): CanonicalQuery<
  Name,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  BuildError,
  BuildRequirements
> => {
  const Model = makeQueryModel(config.data, config.error)
  const Message = makeQueryMessage(config.data, config.error)
  const QueryNamespace = Block.makeNamespace(config.name)
  const QueryDefinition = QueryNamespace.makeDefinition({
    Model,
    Message,
  })
  const Fetch = QueryDefinition.makeCommand('Fetch', {
    args: { generation: Schema.Number },
    messages: [Message.CompletedFetch],
  })
  const api = makeQueryApi(config, Model, Message, Fetch)
  const QueryComposition = QueryDefinition.makeComposition()
  const init = QueryComposition.makeInit(api.init)
  const prepare = () =>
    QueryComposition.prepareBlock({
      init,
      update: QueryComposition.makeUpdate(api.updateHandlers),
      operations: {
        requestReset: Message.RequestedReset,
        requestRevalidation: Message.RequestedRevalidation,
        requestRevalidationOrLoad: Message.RequestedRevalidationOrLoad,
        requestLoadIfMissing: Message.RequestedLoadIfMissing,
      },
      EffectsLayer: api.toLayer(handler),
    })
  const block: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)

  return enrichQuery(block, {
    Fetch,
    read: api.read,
    run: api.run,
    toLayer: api.toLayer,
    operations: block.operations,
  })
}

/** A Query whose fetch definition can be supplied through Block handler assembly. */
export type LayeredQuery<Name extends string, A, AI, E, EI> = Query<
  Name,
  A,
  AI,
  E,
  EI
>

/** @internal Exact completed Block type for a Query with a canonical handler. */
export type CanonicalQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
> = Query<
  Name,
  A,
  AI,
  E,
  EI,
  Layer.Layer<
    QueryFetchHandler<Name, A, AI, E, EI>,
    BuildError,
    Exclude<HandlerRequirements | BuildRequirements, Scope.Scope>
  >,
  readonly []
>

export function defineQuery<Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI>,
): Query<Name, A, AI, E, EI>
export function defineQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
>(
  config: QueryConfig<Name, A, AI, E, EI>,
  handler: Effect.Effect<
    () => Effect.Effect<A, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
): CanonicalQuery<
  Name,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  BuildError,
  BuildRequirements
>
export function defineQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
>(
  config: QueryConfig<Name, A, AI, E, EI>,
  handler?: Effect.Effect<
    () => Effect.Effect<A, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
) {
  if (handler === undefined) {
    return makeHostQuery(config)
  }

  return makeCanonicalQuery(config, handler)
}

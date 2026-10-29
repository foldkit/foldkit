import {
  Clock,
  Duration,
  Effect,
  Function,
  Layer,
  Number,
  Option,
  Result,
  Schema,
  type Scope,
  Tuple,
  pipe,
} from 'effect'

import * as AsyncData from '../../asyncData/public.js'
import * as Block from '../../block/public.js'
import type { ValidateConstructionRequirements } from '../../block/scope.js'
import * as Command from '../../command/index.js'
import type * as Interruptible from '../../command/interruptible/public.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import {
  type CompletedFetchOf,
  type QueryStore,
  applyTransition,
} from './internal.js'
import { cancelData, isFresh, resolveStaleTime } from './policy.js'

type AnyLayer =
  | Layer.Layer<never, unknown, unknown>
  | Layer.Layer<unknown, unknown, unknown>

/** Schemas and identity used to define an unkeyed Query. */
export type QueryConfig<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Notify extends boolean = false,
> = Readonly<{
  /** Block identity and prefix for the Query's Fetch Command. */
  name: Name
  /** Schema for successfully fetched data. */
  data: Schema.Codec<A, AI, never, never>
  /** Schema for expected fetch failures retained in AsyncData. */
  error: Schema.Codec<E, EI, never, never>
  /** Successful data's fresh lifetime. Defaults to Infinity. Expiry does not
   * remove retained data; freshness-aware operations take an explicit Clock time. */
  staleTime?: Duration.Input
  /** Exposes accepted Fetch completions through an OutMessage contract. */
  notifyOnCompletion?: Notify
  execute?: never
}> &
  ([Notify] extends [true] ? Readonly<{ notifyOnCompletion: true }> : unknown)

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
> = Interruptible.DefinitionWithArgs<
  `${Name}/Fetch`,
  { readonly generation: typeof Schema.Number },
  Readonly<{ generation: number }>,
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
    RequestedLoadIfStale: { nowMillis: Schema.Number },
    RequestedCancel: {},
    CompletedFetch: {
      generation: Schema.Number,
      result: Schema.Result(data, error),
      completedAtMillis: Schema.optionalKey(Schema.Number),
    },
    CompletedCancelFetch: {},
  })

const makeQueryOutMessage = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) =>
  defineMessageUnion({
    CompletedFetch: {
      generation: Schema.Number,
      result: Schema.Result(data, error),
      completedAtMillis: Schema.optionalKey(Schema.Number),
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

/** Schema-backed notification for an accepted Query Fetch completion. */
export type QueryOutMessage<A, AI, E, EI> = ReturnType<
  typeof makeQueryOutMessage<A, AI, E, EI>
>

/** Builds the Model Schema for a Query. */
export const makeQueryModel = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
): QueryModel<A, AI, E, EI> =>
  Schema.Struct({
    data: AsyncData.Schema(data, error).schema,
    generation: Schema.Number,
    maybeCompletedAtMillis: Schema.Option(Schema.Number).pipe(
      Schema.withConstructorDefault(Effect.succeed(Option.none())),
    ),
  })

/**
 * Model Schema for a Query containing one `AsyncData` value.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export interface QueryModel<A, AI, E, EI> extends Schema.Struct<
  Readonly<{
    data: Schema.Codec<
      AsyncData.AsyncData<A, E>,
      AsyncData.AsyncDataEncoded<AI, EI>
    >
    generation: typeof Schema.Number
    maybeCompletedAtMillis: Schema.withConstructorDefault<
      Schema.Option<typeof Schema.Number>
    >
  }>
> {}

const makeQueryApi = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fetch extends QueryFetchDefinition<Name, A, AI, E, EI>,
>(
  config: QueryConfig<Name, A, AI, E, EI, boolean>,
  Model: QueryModel<A, AI, E, EI>,
  Message: QueryMessage<A, AI, E, EI>,
  Fetch: Fetch,
) => {
  const staleTimeMillis = resolveStaleTime(config.name, config.staleTime)
  const OutMessage = makeQueryOutMessage(config.data, config.error)
  type Model = typeof Model.Type
  type Message = typeof Message.Type
  type UpdateReturn = Update.Return<
    Model,
    Message,
    QueryFetchHandler<Name, A, AI, E, EI>
  >
  type PureUpdateReturn = Update.Return<Model, Message>
  type CancelReturn = Update.Return<Model, Message>

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
    model: Model.make({
      data: AsyncData.Idle(),
      generation: 0,
      maybeCompletedAtMillis: Option.none(),
    }),
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
  const isQueryFresh = (model: Model, nowMillis: number): boolean =>
    isFresh(
      model.data,
      model.maybeCompletedAtMillis,
      nowMillis,
      staleTimeMillis,
    )
  const loadIfStale = (model: Model, nowMillis: number): UpdateReturn =>
    isQueryFresh(model, nowMillis) ? { model } : revalidateOrLoad(model)
  const cancel = (model: Model): CancelReturn => {
    if (!AsyncData.isPending(model.data)) {
      return { model }
    }

    const oldGeneration = model.generation

    return {
      model: modifyFields(model, {
        data: cancelData,
        generation: Number.increment,
      }),
      commands: [
        Fetch.Interrupt({ generation: oldGeneration }, () =>
          Message.CompletedCancelFetch(),
        ),
      ],
    }
  }
  const completeFetch = (
    model: Model,
    {
      generation,
      result,
      completedAtMillis,
    }: typeof Message.CompletedFetch.Type,
  ): Option.Option<Model> => {
    const data = read(model)

    if (!AsyncData.isPending(data) || generation !== model.generation) {
      return Option.none()
    }

    return Option.some(
      modifyFields(model, {
        data: () => AsyncData.settle(data, result),
        maybeCompletedAtMillis: previous =>
          Result.isSuccess(result)
            ? Option.fromNullishOr(completedAtMillis)
            : previous,
      }),
    )
  }
  const updateHandlers = {
    RequestedReset: (model: Model) => reset(model),
    RequestedRevalidation: (model: Model) => revalidate(model),
    RequestedRevalidationOrLoad: (model: Model) => revalidateOrLoad(model),
    RequestedLoadIfMissing: (model: Model) => loadIfMissing(model),
    RequestedLoadIfStale: (
      model: Model,
      { nowMillis }: typeof Message.RequestedLoadIfStale.Type,
    ) => loadIfStale(model, nowMillis),
    RequestedCancel: (model: Model) => cancel(model),
    CompletedCancelFetch: (model: Model) => ({ model }),
    CompletedFetch: (
      model: Model,
      message: typeof Message.CompletedFetch.Type,
    ) =>
      Option.match(completeFetch(model, message), {
        onNone: () => ({ model }),
        onSome: nextModel => ({ model: nextModel }),
      }),
  }
  const notifyingUpdateHandlers = {
    ...updateHandlers,
    CompletedFetch: (
      model: Model,
      message: typeof Message.CompletedFetch.Type,
    ): Update.ReturnWithOutMessage<Model, Message, typeof OutMessage.Type> => {
      return Option.match(completeFetch(model, message), {
        onNone: () => ({ model }),
        onSome: nextModel => ({
          model: nextModel,
          outMessage: OutMessage.CompletedFetch({
            generation: message.generation,
            result: message.result,
            ...(message.completedAtMillis === undefined
              ? {}
              : { completedAtMillis: message.completedAtMillis }),
          }),
        }),
      })
    },
  }
  const operations = {
    requestLoadIfStale: (nowMillis: number) =>
      Tuple.make(Message.RequestedLoadIfStale({ nowMillis })),
    requestCancel: () => Tuple.make(Message.RequestedCancel()),
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
              Effect.flatMap(result =>
                Effect.map(Clock.currentTimeMillis, completedAtMillis =>
                  Message.CompletedFetch({
                    generation,
                    result,
                    completedAtMillis,
                  }),
                ),
              ),
            ),
      ) as never,
    )

  return {
    init,
    reset,
    read,
    isFresh: isQueryFresh,
    updateHandlers,
    notifyingUpdateHandlers,
    OutMessage,
    revalidate,
    revalidateOrLoad,
    loadIfMissing,
    loadIfStale,
    cancel,
    operations,
    run,
    toLayer,
  }
}

// oxlint-disable effecttsgo/any-unknown-in-error-context
const enrichQuery = <
  BlockValue extends Block.AnyBlock,
  Fetch,
  Read,
  IsFresh,
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
    isFresh: IsFresh
    run: Run
    toLayer: ToLayer
    operations: Operations
  }>,
) => {
  const { replaceEffectsLayer, provideHandlers } = block

  return Object.assign(block, {
    Fetch: api.Fetch,
    read: api.read,
    isFresh: api.isFresh,
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
  /** Uses retained data while fresh; otherwise starts a load or refresh.
   * nowMillis comes from Effect Clock through an application Message. */
  requestLoadIfStale: {
    (
      model: QueryModelType<A, AI, E, EI>,
      nowMillis: number,
    ): Update.Return<
      QueryModelType<A, AI, E, EI>,
      QueryMessageType<A, AI, E, EI>,
      QueryFetchHandler<Name, A, AI, E, EI>
    >
    (
      nowMillis: number,
    ): Update.Step<
      QueryModelType<A, AI, E, EI>,
      QueryMessageType<A, AI, E, EI>,
      QueryFetchHandler<Name, A, AI, E, EI>
    >
  }
  /** Invalidates and interrupts the pending generation, retaining successful data. */
  requestCancel: Update.Step<
    QueryModelType<A, AI, E, EI>,
    QueryMessageType<A, AI, E, EI>
  >
}>

type QueryImplementationOperations<Name extends string, A, AI, E, EI> = Omit<
  QueryExposedOperations<Name, A, AI, E, EI>,
  'requestLoadIfStale'
> &
  Readonly<{
    requestLoadIfStale: (
      model: QueryModelType<A, AI, E, EI>,
      nowMillis: number,
    ) => Update.Return<
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
  Notify extends boolean,
> = Readonly<{
  init: () => Readonly<{ model: QueryModelType<A, AI, E, EI> }>
  update: (
    model: QueryModelType<A, AI, E, EI>,
    message: QueryMessageType<A, AI, E, EI>,
  ) => Notify extends true
    ? Update.ReturnWithOutMessage<
        QueryModelType<A, AI, E, EI>,
        QueryMessageType<A, AI, E, EI>,
        QueryOutMessage<A, AI, E, EI>['Type'],
        QueryFetchHandler<Name, A, AI, E, EI>
      >
    : Update.Return<
        QueryModelType<A, AI, E, EI>,
        QueryMessageType<A, AI, E, EI>,
        QueryFetchHandler<Name, A, AI, E, EI>
      >
  operations: QueryImplementationOperations<Name, A, AI, E, EI>
  EffectsLayer: EffectsLayer
  hostHandlers: HostHandlers
}>

type QueryConveniences<Name extends string, A, AI, E, EI> = Readonly<{
  /** Fetch Command definition owned by this Query Block. */
  Fetch: QueryFetchDefinition<Name, A, AI, E, EI>
  /** Reads the retained AsyncData without exposing the Query Model shape. */
  read: (model: QueryModelType<A, AI, E, EI>) => AsyncData.AsyncData<A, E>
  /** Checks retained successful data against an explicit Effect Clock time. */
  isFresh: (model: QueryModelType<A, AI, E, EI>, nowMillis: number) => boolean
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
  Notify extends boolean,
> = Block.Block<
  Block.Owner<Name, false>,
  QueryModel<A, AI, E, EI>,
  QueryMessage<A, AI, E, EI>,
  Notify extends true ? QueryOutMessage<A, AI, E, EI> : undefined,
  readonly [],
  readonly [],
  QueryImplementation<Name, A, AI, E, EI, EffectsLayer, HostHandlers, Notify>
>

type QueryShape<
  Name extends string,
  A,
  AI,
  E,
  EI,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
  Notify extends boolean,
> = Omit<
  QueryBlockBase<Name, A, AI, E, EI, EffectsLayer, HostHandlers, Notify>,
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
              HostHandlers,
              Notify
            >
          >
        >,
    ) => Query<Name, A, AI, E, EI, SelectedEffectsLayer, HostHandlers, Notify>
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
          readonly [],
          Notify
        >
      : never
  }>

/** Named completed Query contract with accepted-completion OutMessages. */
export interface QueryWithOutMessage<
  Name extends string,
  A,
  AI,
  E,
  EI,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
> extends QueryShape<Name, A, AI, E, EI, EffectsLayer, HostHandlers, true> {}

/** Named completed Query contract without a completion OutMessage contract. */
export interface QueryWithoutOutMessage<
  Name extends string,
  A,
  AI,
  E,
  EI,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
> extends QueryShape<Name, A, AI, E, EI, EffectsLayer, HostHandlers, false> {}

/**
 * Viewless Block for fetching and retaining one `AsyncData` value.
 *
 * EffectsLayer and HostHandlers describe handler assembly. Notify selects the
 * optional accepted-completion OutMessage contract; it defaults to false.
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
  Notify extends boolean = false,
> = Notify extends true
  ? QueryWithOutMessage<Name, A, AI, E, EI, EffectsLayer, HostHandlers>
  : QueryWithoutOutMessage<Name, A, AI, E, EI, EffectsLayer, HostHandlers>

const makeQueryParts = <Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI, boolean>,
) => {
  const Model = makeQueryModel(config.data, config.error)
  const Message = makeQueryMessage(config.data, config.error)
  const QueryNamespace = Block.makeNamespace(config.name)
  const makePlain = (): LayeredQuery<Name, A, AI, E, EI> => {
    const Definition = QueryNamespace.makeDefinition({ Model, Message })
    const Fetch = Definition.makeCommand('Fetch', {
      args: { generation: Schema.Number },
      messages: [Message.CompletedFetch],
      interrupt: {
        keyFields: ['generation'],
        toKey: ({ generation }) => `${generation}`,
      },
    })
    const api = makeQueryApi(config, Model, Message, Fetch)
    const Composition = Definition.makeComposition()
    const init = Composition.makeInit(api.init)
    const prepare = () =>
      Composition.prepareBlock({
        init,
        update: Composition.makeUpdate(api.updateHandlers),
        operations: {
          requestReset: Message.RequestedReset,
          requestRevalidation: Message.RequestedRevalidation,
          requestRevalidationOrLoad: Message.RequestedRevalidationOrLoad,
          requestLoadIfMissing: Message.RequestedLoadIfMissing,
          ...api.operations,
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
      isFresh: api.isFresh,
      run: api.run,
      toLayer: api.toLayer,
      operations: {
        ...block.operations,
        requestLoadIfStale: Function.dual(
          2,
          block.operations.requestLoadIfStale,
        ),
        requestCancel: block.operations.requestCancel,
      },
    })
  }
  const makeNotifying = (): LayeredQuery<Name, A, AI, E, EI, true> => {
    const OutMessage = makeQueryOutMessage(config.data, config.error)
    const Definition = QueryNamespace.makeDefinition({
      Model,
      Message,
      OutMessage,
    })
    const Fetch = Definition.makeCommand('Fetch', {
      args: { generation: Schema.Number },
      messages: [Message.CompletedFetch],
      interrupt: {
        keyFields: ['generation'],
        toKey: ({ generation }) => `${generation}`,
      },
    })
    const api = makeQueryApi(config, Model, Message, Fetch)
    const Composition = Definition.makeComposition()
    const init = Composition.makeInit(api.init)
    const prepare = () =>
      Composition.prepareBlock({
        init,
        update: Composition.makeUpdate(api.notifyingUpdateHandlers),
        operations: {
          requestReset: Message.RequestedReset,
          requestRevalidation: Message.RequestedRevalidation,
          requestRevalidationOrLoad: Message.RequestedRevalidationOrLoad,
          requestLoadIfMissing: Message.RequestedLoadIfMissing,
          ...api.operations,
        },
        EffectsLayer: Layer.empty,
        hostHandlers: [Fetch],
      })
    const block: Block.FromAssemblyWithOutMessage<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)

    return enrichQuery(block, {
      Fetch,
      read: api.read,
      isFresh: api.isFresh,
      run: api.run,
      toLayer: api.toLayer,
      operations: {
        ...block.operations,
        requestLoadIfStale: Function.dual(
          2,
          block.operations.requestLoadIfStale,
        ),
        requestCancel: block.operations.requestCancel,
      },
    })
  }

  return { makePlain, makeNotifying }
}

/** A Query whose fetch definition can be supplied through Block handler assembly. */
export type LayeredQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Notify extends boolean = false,
> = Query<
  Name,
  A,
  AI,
  E,
  EI,
  Layer.Layer<never, never, never>,
  readonly [QueryFetchDefinition<Name, A, AI, E, EI>],
  Notify
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
  Notify extends boolean = false,
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
  readonly [],
  Notify
>

export function defineQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  const Notify extends boolean = false,
>(
  config: QueryConfig<Name, A, AI, E, EI, Notify>,
): LayeredQuery<Name, A, AI, E, EI, Notify>
export function defineQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
  const Notify extends boolean = false,
>(
  config: QueryConfig<Name, A, AI, E, EI, Notify>,
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
  BuildRequirements,
  Notify
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
  config: QueryConfig<Name, A, AI, E, EI, boolean>,
  handler?: Effect.Effect<
    () => Effect.Effect<A, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
): unknown {
  const parts = makeQueryParts(config)
  const query =
    config.notifyOnCompletion === true
      ? parts.makeNotifying()
      : parts.makePlain()

  if (handler === undefined) {
    return query
  }

  return query.provideHandlers(query.toLayer(handler))
}

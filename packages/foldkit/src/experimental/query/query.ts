import {
  Effect,
  Function,
  Layer,
  Number,
  Option,
  Result,
  Schema,
  type Scope,
} from 'effect'

import * as AsyncData from '../../asyncData/public.js'
import * as Block from '../../block/public.js'
import type { ValidateConstructionRequirements } from '../../block/scope.js'
import * as Command from '../../command/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import { type QueryStore, applyTransition } from './internal.js'
import { cancelData } from './policy.js'
import {
  type QueryAccessors,
  type QueryConfig,
  type QueryFetchApi,
  type QueryFetchCommand,
  type QueryFetchDefinition,
  type QueryFetchHandler,
  type QueryMessage,
  type QueryModel,
  type QueryOutMessage,
  type QueryToLayer,
  type QueryTransitionMessages,
  makeQueryAccessors,
  makeQueryFetchApi,
  makeQueryMessage,
  makeQueryModel,
  makeQueryOperations,
  makeQueryOutMessage,
} from './queryContract.js'

type AnyLayer =
  | Layer.Layer<never, unknown, unknown>
  | Layer.Layer<unknown, unknown, unknown>

export type {
  QueryConfig,
  QueryToLayer,
  QueryMessage,
  QueryOutMessage,
  QueryModel,
  QueryOperationDeclarations,
} from './queryContract.js'
export {
  makeQueryMessage,
  makeQueryOutMessage,
  makeQueryModel,
  makeQueryOperations,
} from './queryContract.js'

type QueryMessageAt<Message, Tag extends string> = Extract<
  Message,
  Readonly<{ _tag: Tag }>
>

type QueryCommandMessage<Message> = Extract<
  Message,
  Readonly<{ _tag: 'CompletedFetch' | 'CompletedCancelFetch' }>
>

type QueryApiHandlers<Model, Message, Requirements> = Readonly<{
  RequestedReset: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>>
  RequestedRevalidation: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>, Requirements>
  RequestedRevalidationOrLoad: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>, Requirements>
  RequestedLoadIfMissing: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>, Requirements>
  RequestedLoadIfStale: (
    model: Model,
    message: QueryMessageAt<Message, 'RequestedLoadIfStale'>,
  ) => Update.Return<Model, QueryCommandMessage<Message>, Requirements>
  RequestedCancel: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>>
  CompletedCancelFetch: (model: Model) => Readonly<{ model: Model }>
  CompletedFetch: (
    model: Model,
    message: QueryMessageAt<Message, 'CompletedFetch'>,
  ) => Readonly<{ model: Model }>
}>

/** @internal Named shared Query transitions preserving their individual result channels. */
export interface QueryApi<
  Model,
  Message,
  OutMessageSchema extends Schema.Codec<any, any, any, any>,
  A,
  E,
  Requirements,
>
  extends QueryAccessors<Model, A, E>, QueryFetchApi<A, E, Requirements> {
  readonly init: () => Readonly<{ model: Model }>
  readonly reset: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>>
  readonly updateHandlers: QueryApiHandlers<Model, Message, Requirements>
  readonly notifyingUpdateHandlers: Omit<
    QueryApiHandlers<Model, Message, Requirements>,
    'CompletedFetch'
  > &
    Readonly<{
      CompletedFetch: (
        model: Model,
        message: QueryMessageAt<Message, 'CompletedFetch'>,
      ) => Update.ReturnWithOutMessage<
        Model,
        QueryCommandMessage<Message>,
        OutMessageSchema['Type']
      >
    }>
  readonly OutMessage: OutMessageSchema
  readonly revalidate: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>, Requirements>
  readonly revalidateOrLoad: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>, Requirements>
  readonly loadIfMissing: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>, Requirements>
  readonly loadIfStale: (
    model: Model,
    nowMillis: number,
  ) => Update.Return<Model, QueryCommandMessage<Message>, Requirements>
  readonly cancel: (
    model: Model,
  ) => Update.Return<Model, QueryCommandMessage<Message>>
}

/** @internal Shares Query transitions and fetch recipes without completing a Block. */
export const makeQueryApi = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  FetchName extends string,
>(
  config: QueryConfig<Name, A, AI, E, EI, boolean>,
  Model: QueryModel<A, AI, E, EI>,
  Message: QueryTransitionMessages<A, AI, E, EI>,
  Fetch: QueryFetchCommand<FetchName, A, AI, E, EI>,
  OutMessage: QueryOutMessage<A, AI, E, EI> = makeQueryOutMessage(
    config.data,
    config.error,
  ),
): QueryApi<
  QueryModelType<A, AI, E, EI>,
  QueryMessageType<A, AI, E, EI>,
  QueryOutMessage<A, AI, E, EI>,
  A,
  E,
  Command.HandlerOf<QueryFetchCommand<FetchName, A, AI, E, EI>>
> => {
  type Model = typeof Model.Type
  type Message = QueryMessageType<A, AI, E, EI>
  type UpdateReturn = Update.Return<
    Model,
    QueryCommandMessage<Message>,
    Command.HandlerOf<typeof Fetch>
  >
  type PureUpdateReturn = Update.Return<Model, QueryCommandMessage<Message>>
  type CancelReturn = Update.Return<Model, QueryCommandMessage<Message>>

  const store: QueryStore<
    Model,
    undefined,
    A,
    E,
    QueryCommandMessage<Message>,
    Command.HandlerOf<typeof Fetch>
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
  const { read, isFresh: isQueryFresh } = makeQueryAccessors(config)
  const revalidate = (model: Model): UpdateReturn =>
    applyTransition(store, model, undefined, AsyncData.revalidate)
  const revalidateOrLoad = (model: Model): UpdateReturn =>
    applyTransition(store, model, undefined, AsyncData.revalidateOrLoad)
  const loadIfMissing = (model: Model): UpdateReturn =>
    applyTransition(store, model, undefined, AsyncData.loadIfMissing)
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
    ): Update.ReturnWithOutMessage<
      Model,
      QueryCommandMessage<Message>,
      typeof OutMessage.Type
    > => {
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
  const { run, toLayer } = makeQueryFetchApi(Message, Fetch)

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
        operations: makeQueryOperations(Message),
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
    const api = makeQueryApi(config, Model, Message, Fetch, OutMessage)
    const Composition = Definition.makeComposition()
    const init = Composition.makeInit(api.init)
    const prepare = () =>
      Composition.prepareBlock({
        init,
        update: Composition.makeUpdate(api.notifyingUpdateHandlers),
        operations: makeQueryOperations(Message),
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

import {
  Clock,
  type Duration,
  Effect,
  Layer,
  Number,
  Option,
  Result,
  Schema,
  type Scope,
  pipe,
} from 'effect'

import * as AsyncData from '../../asyncData/public.js'
import { Block } from '../../blocks/block.js'
import type * as BlockTypes from '../../blocks/public.js'
import * as Command from '../../command/index.js'
import { __makeRegistry } from '../../command/interruptible/interruptible.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import {
  type AsyncDataTransition,
  type QueryFetcher,
  makeFetcher,
  makeFetcherLayer,
  runWhileHoldingKey,
} from './internal.js'
import { cancelData, isFresh, resolveStaleTime } from './policy.js'

/** Schemas and identity used to define an unkeyed Query. */
export type QueryConfig<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Notify extends boolean = false,
> = Readonly<{
  /** Block id and prefix for the Query's Fetch and CancelFetch Commands. */
  name: Name
  /** Schema for successfully fetched data. */
  data: Schema.Codec<A, AI, never, never>
  /** Schema for expected fetch failures retained in AsyncData. */
  error: Schema.Codec<E, EI, never, never>
  /** Successful data's fresh lifetime. Defaults to Infinity. Expiry does not
   * remove retained data; freshness-aware Messages carry an explicit Clock time. */
  staleTime?: Duration.Input
  /** Reports accepted Fetch completions through the `CompletedFetch` OutMessage. */
  notifyOnCompletion?: Notify
}> &
  ([Notify] extends [true] ? Readonly<{ notifyOnCompletion: true }> : unknown)

/** Constructor args for a Query instance. Pass `{}` for an Idle Query. */
export type QueryArgs = Readonly<{
  /** Starts the first fetch when the instance enters its parent's Model. */
  isLoadingOnStart?: boolean
}>

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

/** @internal The pure policy of a Query: its Schemas, Commands, and the
 *  transitions its update handlers apply. */
export const makeQueryPolicy = <Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI, boolean>,
) => {
  const staleTimeMillis = resolveStaleTime(config.name, config.staleTime)
  const Model = makeQueryModel(config.data, config.error)
  const Message = makeQueryMessage(config.data, config.error)
  const OutMessage = makeQueryOutMessage(config.data, config.error)
  type Model = typeof Model.Type
  type Message = typeof Message.Type

  const Fetch = Command.define(`${config.name}/Fetch`, {
    args: { generation: Schema.Number },
    messages: [Message.CompletedFetch],
  })
  const CancelFetch = Command.define(`${config.name}/CancelFetch`, {
    args: { generation: Schema.Number },
    messages: [Message.CompletedCancelFetch],
  })
  const Fetcher = makeFetcher<Name, () => Effect.Effect<A, E>>(config.name)

  type Commands = ReadonlyArray<
    ReturnType<typeof Fetch> | ReturnType<typeof CancelFetch>
  >
  type Return = Readonly<{ model: Model; commands?: Commands }>
  type FetchReturn = Readonly<{
    model: Model
    commands?: ReadonlyArray<ReturnType<typeof Fetch>>
  }>
  type CancelReturn = Readonly<{
    model: Model
    commands?: ReadonlyArray<ReturnType<typeof CancelFetch>>
  }>

  const init = (): Readonly<{ model: Model }> => ({
    model: Model.make({
      data: AsyncData.Idle(),
      generation: 0,
      maybeCompletedAtMillis: Option.none(),
    }),
  })
  const read = (model: Model): AsyncData.AsyncData<A, E> => model.data
  const applyTransition = (
    model: Model,
    transition: AsyncDataTransition,
  ): FetchReturn =>
    Option.match(transition(model.data), {
      onNone: () => ({ model }),
      onSome: nextData => {
        const nextGeneration = Number.increment(model.generation)

        return {
          model: modifyFields(model, {
            data: () => nextData,
            generation: () => nextGeneration,
          }),
          commands: [Fetch({ generation: nextGeneration })],
        }
      },
    })
  const requestReset = (model: Model): Readonly<{ model: Model }> => ({
    model: modifyFields(model, { data: () => AsyncData.Idle() }),
  })
  const requestRevalidation = (model: Model): FetchReturn =>
    applyTransition(model, AsyncData.revalidate)
  const requestRevalidationOrLoad = (model: Model): FetchReturn =>
    applyTransition(model, AsyncData.revalidateOrLoad)
  const requestLoadIfMissing = (model: Model): FetchReturn =>
    applyTransition(model, AsyncData.loadIfMissing)
  const isQueryFresh = (model: Model, nowMillis: number): boolean =>
    isFresh(
      model.data,
      model.maybeCompletedAtMillis,
      nowMillis,
      staleTimeMillis,
    )
  const requestLoadIfStale = (model: Model, nowMillis: number): FetchReturn => {
    if (isQueryFresh(model, nowMillis)) {
      return { model }
    } else {
      return requestRevalidationOrLoad(model)
    }
  }
  const requestCancel = (model: Model): CancelReturn => {
    if (!AsyncData.isPending(model.data)) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        data: cancelData,
        generation: Number.increment,
      }),
      commands: [CancelFetch({ generation: model.generation })],
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
    if (!AsyncData.isPending(model.data) || generation !== model.generation) {
      return Option.none()
    }

    return Option.some(
      modifyFields(model, {
        data: () => AsyncData.settle(model.data, result),
        maybeCompletedAtMillis: previous =>
          Result.isSuccess(result)
            ? Option.fromNullishOr(completedAtMillis)
            : previous,
      }),
    )
  }

  const updateHandlers = {
    RequestedReset: requestReset,
    RequestedRevalidation: requestRevalidation,
    RequestedRevalidationOrLoad: requestRevalidationOrLoad,
    RequestedLoadIfMissing: requestLoadIfMissing,
    RequestedLoadIfStale: (
      model: Model,
      { nowMillis }: typeof Message.RequestedLoadIfStale.Type,
    ) => requestLoadIfStale(model, nowMillis),
    RequestedCancel: requestCancel,
    CompletedCancelFetch: (model: Model): Return => ({ model }),
    CompletedFetch: (
      model: Model,
      message: typeof Message.CompletedFetch.Type,
    ): Return =>
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
    ): Readonly<{ model: Model; outMessage?: typeof OutMessage.Type }> =>
      Option.match(completeFetch(model, message), {
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
      }),
  }
  const update = (
    model: Model,
    message: Message,
  ): Readonly<{
    model: Model
    commands?: Commands
    outMessage?: typeof OutMessage.Type
  }> => {
    const handlers =
      config.notifyOnCompletion === true
        ? notifyingUpdateHandlers
        : updateHandlers
    const tag: string = message._tag
    const handler: (model: Model, message: Message) => Return = Reflect.get(
      handlers,
      tag,
    )
    return handler(model, message)
  }
  const startModel = ({
    isLoadingOnStart = false,
  }: QueryArgs): Readonly<{ model: Model; start: Commands }> => {
    if (isLoadingOnStart) {
      const started = requestLoadIfMissing(init().model)
      return { model: started.model, start: started.commands ?? [] }
    } else {
      return { model: init().model, start: [] }
    }
  }
  const makeFetchHandlers = (execute: () => Effect.Effect<A, E>) => {
    const registry = __makeRegistry()

    return {
      fetch: ({ generation }: Readonly<{ generation: number }>) =>
        runWhileHoldingKey(
          registry,
          `${generation}`,
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
        ),
      cancelFetch: ({ generation }: Readonly<{ generation: number }>) =>
        Effect.as(
          registry.interrupt(`${generation}`),
          Message.CompletedCancelFetch(),
        ),
    }
  }
  const run: Effect.Effect<
    AsyncData.AsyncData<A, E>,
    never,
    QueryFetcher<Name>
  > = Effect.flatMap(Fetcher, execute =>
    pipe(
      execute(),
      Effect.result,
      Effect.map(result => AsyncData.settle(AsyncData.Loading(), result)),
    ),
  )

  return {
    name: config.name,
    Model,
    Message,
    OutMessage,
    Fetch,
    CancelFetch,
    Fetcher,
    init,
    read,
    isFresh: isQueryFresh,
    requestReset,
    requestRevalidation,
    requestRevalidationOrLoad,
    requestLoadIfMissing,
    requestLoadIfStale,
    requestCancel,
    update,
    updateHandlers,
    notifyingUpdateHandlers,
    startModel,
    makeFetchHandlers,
    run,
  }
}

type QueryPolicy<Name extends string, A, AI, E, EI> = ReturnType<
  typeof makeQueryPolicy<Name, A, AI, E, EI>
>

type FetchBuild<A, E, R, BuildE, BuildR> = Effect.Effect<
  () => Effect.Effect<A, E, R>,
  BuildE,
  BuildR
>

type CompletedFetch<A, AI, E, EI> = QueryMessage<
  A,
  AI,
  E,
  EI
>['CompletedFetch']['Type']

type CompletedCancelFetch<A, AI, E, EI> = QueryMessage<
  A,
  AI,
  E,
  EI
>['CompletedCancelFetch']['Type']

/** Fetch Command definition owned by a Query. */
export type QueryFetch<
  Name extends string,
  A,
  AI,
  E,
  EI,
> = Command.LayeredCommandDefinitionWithArgs<
  `${Name}/Fetch`,
  { generation: typeof Schema.Number },
  CompletedFetch<A, AI, E, EI>
>

/** CancelFetch Command definition owned by a Query. */
export type QueryCancelFetch<
  Name extends string,
  A,
  AI,
  E,
  EI,
> = Command.LayeredCommandDefinitionWithArgs<
  `${Name}/CancelFetch`,
  { generation: typeof Schema.Number },
  CompletedCancelFetch<A, AI, E, EI>
>

type PlainContract<Name extends string, A, AI, E, EI> = Readonly<{
  Model: QueryModel<A, AI, E, EI>
  Message: QueryMessage<A, AI, E, EI>
  Command: readonly [
    QueryFetch<Name, A, AI, E, EI>,
    QueryCancelFetch<Name, A, AI, E, EI>,
  ]
}>

type NotifyingContract<Name extends string, A, AI, E, EI> = PlainContract<
  Name,
  A,
  AI,
  E,
  EI
> &
  Readonly<{ OutMessage: QueryOutMessage<A, AI, E, EI> }>

type QueryContract<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Notify extends boolean,
> = Notify extends true
  ? NotifyingContract<Name, A, AI, E, EI>
  : PlainContract<Name, A, AI, E, EI>

/**
 * A Query instance: a viewless Block that fetches and retains one
 * `AsyncData` value. Store it in the parent Model and send it `Requested*`
 * Messages. Notify selects whether it reports accepted completions through
 * the `CompletedFetch` OutMessage.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export interface Query<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Notify extends boolean = false,
> extends BlockTypes.Instance<
  Query<Name, A, AI, E, EI, Notify>,
  QueryContract<Name, A, AI, E, EI, Notify>,
  QueryArgs
> {}

/** The statics a Query class carries beside its Block contract. */
export type QueryStatics<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Notify extends boolean,
> = Readonly<{
  /** Fetch Command definition owned by this Query. Match and resolve it in
   *  Story and Scene tests. */
  Fetch: QueryFetch<Name, A, AI, E, EI>
  /** CancelFetch Command definition returned by `RequestedCancel`. */
  CancelFetch: QueryCancelFetch<Name, A, AI, E, EI>
  /** Reads the retained AsyncData from the Query Model. */
  read: (model: QueryModel<A, AI, E, EI>['Type']) => AsyncData.AsyncData<A, E>
  /** Checks retained successful data against an explicit Effect Clock time. */
  isFresh: (
    model: QueryModel<A, AI, E, EI>['Type'],
    nowMillis: number,
  ) => boolean
  /** Runs the fetch function directly and returns settled AsyncData. Provide
   *  the Query's Layer to supply the fetch function. */
  run: Effect.Effect<AsyncData.AsyncData<A, E>, never, QueryFetcher<Name>>
  /** Builds the Query's Layer from an Effect that constructs its fetch
   *  function. The fetch function is constructed once when the Layer is
   *  built and runs for every Fetch Command. */
  toLayer: <R, BuildE = never, BuildR = never>(
    build: FetchBuild<A, E, R, BuildE, BuildR>,
  ) => Layer.Layer<
    Query<Name, A, AI, E, EI, Notify> | QueryFetcher<Name>,
    BuildE,
    Exclude<R | BuildR, Scope.Scope>
  >
}>

/**
 * A Query class. Put it in a parent Model Schema, create instances with
 * `yield* new PostsQuery('posts', {})`, and provide its Layer.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type QueryClass<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Notify extends boolean = false,
> = BlockTypes.BlockClass<
  Query<Name, A, AI, E, EI, Notify>,
  Name,
  QueryArgs,
  void,
  never,
  QueryContract<Name, A, AI, E, EI, Notify>
> &
  QueryStatics<Name, A, AI, E, EI, Notify>

/** A Query class whose definition included a `handler`, with its Layer
 *  attached as `Live`. */
export type QueryWithLive<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Notify extends boolean,
  BuildE,
  R,
> = QueryClass<Name, A, AI, E, EI, Notify> &
  Readonly<{
    /** The Query's Layer, built from its `handler`. */
    Live: Layer.Layer<
      Query<Name, A, AI, E, EI, Notify> | QueryFetcher<Name>,
      BuildE,
      Exclude<R, Scope.Scope>
    >
  }>

const makeConstructor =
  <Name extends string, A, AI, E, EI, Update>(
    policy: QueryPolicy<Name, A, AI, E, EI>,
    update: Update,
  ) =>
  (_id: string, args: QueryArgs) =>
    Effect.gen(function* () {
      const execute = yield* policy.Fetcher
      const { model, start } = policy.startModel(args)
      const { fetch, cancelFetch } = policy.makeFetchHandlers(execute)

      return {
        model,
        start,
        update,
        // NOTE: the engine's handler record is keyed by Command name, which
        // TypeScript cannot resolve for a generic Query name.
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        commands: {
          [policy.Fetch.name]: fetch,
          [policy.CancelFetch.name]: cancelFetch,
        } as never,
      }
    })

const makePlainQuery = <Name extends string, A, AI, E, EI>(
  policy: QueryPolicy<Name, A, AI, E, EI>,
): QueryClass<Name, A, AI, E, EI, false> => {
  const contract: PlainContract<Name, A, AI, E, EI> = {
    Model: policy.Model,
    Message: policy.Message,
    Command: [policy.Fetch, policy.CancelFetch],
  }
  const QueryBlock = Block<Query<Name, A, AI, E, EI, false>, QueryArgs>()(
    policy.name,
    contract,
  )
  const toLayer = <R, BuildE = never, BuildR = never>(
    build: FetchBuild<A, E, R, BuildE, BuildR>,
  ) =>
    QueryBlock.make(makeConstructor(policy, policy.updateHandlers)).pipe(
      Layer.provideMerge(makeFetcherLayer(policy.Fetcher, build)),
    )

  return Object.assign(QueryBlock, {
    Fetch: policy.Fetch,
    CancelFetch: policy.CancelFetch,
    read: policy.read,
    isFresh: policy.isFresh,
    run: policy.run,
    toLayer,
  })
}

const makeNotifyingQuery = <Name extends string, A, AI, E, EI>(
  policy: QueryPolicy<Name, A, AI, E, EI>,
): QueryClass<Name, A, AI, E, EI, true> => {
  const contract: NotifyingContract<Name, A, AI, E, EI> = {
    Model: policy.Model,
    Message: policy.Message,
    OutMessage: policy.OutMessage,
    Command: [policy.Fetch, policy.CancelFetch],
  }
  const QueryBlock = Block<Query<Name, A, AI, E, EI, true>, QueryArgs>()(
    policy.name,
    contract,
  )
  const toLayer = <R, BuildE = never, BuildR = never>(
    build: FetchBuild<A, E, R, BuildE, BuildR>,
  ) =>
    QueryBlock.make(
      makeConstructor(policy, policy.notifyingUpdateHandlers),
    ).pipe(Layer.provideMerge(makeFetcherLayer(policy.Fetcher, build)))

  return Object.assign(QueryBlock, {
    Fetch: policy.Fetch,
    CancelFetch: policy.CancelFetch,
    read: policy.read,
    isFresh: policy.isFresh,
    run: policy.run,
    toLayer,
  })
}

/** @internal Defines an unkeyed Query class, attaching `Live` when a fetch
 *  constructor is given. */
export const defineQuery = <Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI, boolean>,
  build?: FetchBuild<A, E, never, never, never>,
): unknown => {
  const policy = makeQueryPolicy(config)
  const query =
    config.notifyOnCompletion === true
      ? makeNotifyingQuery(policy)
      : makePlainQuery(policy)

  if (build === undefined) {
    return query
  } else {
    return Object.assign(query, { Live: query.toLayer(build) })
  }
}

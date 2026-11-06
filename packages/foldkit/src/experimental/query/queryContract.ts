import {
  Clock,
  type Duration,
  Effect,
  Layer,
  Option,
  Schema,
  type Scope,
  Tuple,
  pipe,
} from 'effect'

import * as AsyncData from '../../asyncData/public.js'
import type { ValidateConstructionRequirements } from '../../block/scope.js'
import type * as Command from '../../command/index.js'
import type * as Interruptible from '../../command/interruptible/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../message/index.js'
import type { CompletedFetchOf } from './internal.js'
import { isFresh, resolveStaleTime } from './policy.js'

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

/** @internal Exact Fetch handler identity used by public Query contracts. */
export type QueryFetchHandler<
  Name extends string,
  A,
  AI,
  E,
  EI,
> = Command.Handler<
  `${Name}/Fetch`,
  QueryFetchArgs,
  CompletedFetchOf<QueryMessage<A, AI, E, EI>>
>

/** @internal Exact Fetch definition contract shared by Query authoring. */
export type QueryFetchCommand<
  FetchName extends string,
  A,
  AI,
  E,
  EI,
> = Interruptible.DefinitionWithArgs<
  FetchName,
  { readonly generation: typeof Schema.Number },
  Readonly<{ generation: number }>,
  Effect.Effect<
    CompletedFetchOf<QueryMessage<A, AI, E, EI>>,
    never,
    Command.Handler<
      FetchName,
      QueryFetchArgs,
      CompletedFetchOf<QueryMessage<A, AI, E, EI>>
    >
  >
> &
  Readonly<{
    toLayer: Command.ToLayer<
      FetchName,
      QueryFetchArgs,
      CompletedFetchOf<QueryMessage<A, AI, E, EI>>
    >
  }>

/** @internal Exact Fetch definition contract shared by Query authoring. */
export type QueryFetchDefinition<
  Name extends string,
  A,
  AI,
  E,
  EI,
> = QueryFetchCommand<`${Name}/Fetch`, A, AI, E, EI>

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

const queryInputCases = {
  RequestedReset: {},
  RequestedRevalidation: {},
  RequestedRevalidationOrLoad: {},
  RequestedLoadIfMissing: {},
  RequestedCancel: {},
}

const queryLocalCases = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) => ({
  RequestedLoadIfStale: { nowMillis: Schema.Number },
  CompletedFetch: {
    generation: Schema.Number,
    result: Schema.Result(data, error),
    completedAtMillis: Schema.optionalKey(Schema.Number),
  },
  CompletedCancelFetch: {},
})

/** @internal Builds native Query Messages for the explicit operation adapter. */
export const makeQueryMessage = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) => defineMessageUnion({ ...queryInputCases, ...queryLocalCases(data, error) })

/** @internal Builds the Query's local completion and Clock adapter Messages. */
export const makeQueryLocalMessage = <A, AI, E, EI>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
) => defineMessageUnion(queryLocalCases(data, error))

/** @internal Builds the parent-owned Query request contract. */
export const makeQueryInMessage = () => defineInMessageUnion(queryInputCases)

/** Schema-backed local Query completions and the explicit Clock adapter. */
export type QueryLocalMessage<A, AI, E, EI> = ReturnType<
  typeof makeQueryLocalMessage<A, AI, E, EI>
>

/** Schema-backed parent requests accepted by a Query. */
export type QueryInMessage = ReturnType<typeof makeQueryInMessage>

/** @internal Constructors required by shared Query transitions. */
export type QueryTransitionMessages<A, AI, E, EI> = Pick<
  QueryMessage<A, AI, E, EI>,
  'CompletedFetch' | 'CompletedCancelFetch' | 'RequestedLoadIfStale'
>

/** @internal Builds the canonical accepted-completion OutMessage Schema. */
export const makeQueryOutMessage = <A, AI, E, EI>(
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

/** @internal Exact operation constructors and tuple-producing Query adapters. */
export type QueryOperationDeclarations = Readonly<{
  readonly requestReset: QueryMessage<
    never,
    never,
    never,
    never
  >['RequestedReset']
  readonly requestRevalidation: QueryMessage<
    never,
    never,
    never,
    never
  >['RequestedRevalidation']
  readonly requestRevalidationOrLoad: QueryMessage<
    never,
    never,
    never,
    never
  >['RequestedRevalidationOrLoad']
  readonly requestLoadIfMissing: QueryMessage<
    never,
    never,
    never,
    never
  >['RequestedLoadIfMissing']
  readonly requestLoadIfStale: (
    nowMillis: number,
  ) => [
    QueryMessage<never, never, never, never>['RequestedLoadIfStale']['Type'],
  ]
  readonly requestCancel: () => [
    QueryMessage<never, never, never, never>['RequestedCancel']['Type'],
  ]
}>

/** @internal Declares every Query operation from its canonical local Messages. */
export const makeQueryOperations = <A, AI, E, EI>(
  Message: QueryMessage<A, AI, E, EI>,
): QueryOperationDeclarations => ({
  requestReset: Message.RequestedReset,
  requestRevalidation: Message.RequestedRevalidation,
  requestRevalidationOrLoad: Message.RequestedRevalidationOrLoad,
  requestLoadIfMissing: Message.RequestedLoadIfMissing,
  ...makeQueryClockOperations(Message),
  requestCancel: () => Tuple.make(Message.RequestedCancel()),
})

/** @internal Preserves the positional Clock argument on the explicit adapter. */
export const makeQueryClockOperations = <A, AI, E, EI>(
  Message: QueryTransitionMessages<A, AI, E, EI>,
): Pick<QueryOperationDeclarations, 'requestLoadIfStale'> => ({
  requestLoadIfStale: (nowMillis: number) =>
    Tuple.make(Message.RequestedLoadIfStale({ nowMillis })),
})

/** @internal Pure Query reads independent of transition implementation. */
export interface QueryAccessors<Model, A, E> {
  readonly read: (model: Model) => AsyncData.AsyncData<A, E>
  readonly isFresh: (model: Model, nowMillis: number) => boolean
}

/** @internal Builds Query reads from the static cache policy. */
export const makeQueryAccessors = <Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI, boolean>,
): QueryAccessors<QueryModel<A, AI, E, EI>['Type'], A, E> => {
  const staleTimeMillis = resolveStaleTime(config.name, config.staleTime)
  type Model = QueryModel<A, AI, E, EI>['Type']

  const read = (model: Model): AsyncData.AsyncData<A, E> => model.data
  const isQueryFresh = (model: Model, nowMillis: number): boolean =>
    isFresh(
      model.data,
      model.maybeCompletedAtMillis,
      nowMillis,
      staleTimeMillis,
    )

  return { read, isFresh: isQueryFresh }
}

/** @internal Fetch execution and provider recipes independent of Query transitions. */
export interface QueryFetchApi<A, E, Requirements> {
  readonly run: Effect.Effect<AsyncData.AsyncData<A, E>, never, Requirements>
  readonly toLayer: <
    HandlerRequirements,
    BuildError = never,
    BuildRequirements = never,
  >(
    build: Effect.Effect<
      () => Effect.Effect<A, E, HandlerRequirements>,
      BuildError,
      BuildRequirements
    > &
      ValidateConstructionRequirements<BuildRequirements>,
  ) => Layer.Layer<
    Requirements,
    BuildError,
    Exclude<HandlerRequirements | BuildRequirements, Scope.Scope>
  >
}

/** @internal Builds fetch recipes around the exact registered Fetch identity. */
export const makeQueryFetchApi = <A, AI, E, EI, FetchName extends string>(
  Message: QueryTransitionMessages<A, AI, E, EI>,
  Fetch: QueryFetchCommand<FetchName, A, AI, E, EI>,
): QueryFetchApi<
  A,
  E,
  Command.HandlerOf<QueryFetchCommand<FetchName, A, AI, E, EI>>
> => {
  const run = pipe(
    Fetch({ generation: 0 }).effect,
    Effect.map(({ result }) => AsyncData.settle(AsyncData.Loading(), result)),
  )
  const toLayer = <HandlerR, BuildE = never, BuildR = never>(
    build: Effect.Effect<() => Effect.Effect<A, E, HandlerR>, BuildE, BuildR> &
      ValidateConstructionRequirements<BuildR>,
  ): Layer.Layer<
    Command.HandlerOf<typeof Fetch>,
    BuildE,
    Exclude<HandlerR | BuildR, Scope.Scope>
  > =>
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

  return { run, toLayer }
}

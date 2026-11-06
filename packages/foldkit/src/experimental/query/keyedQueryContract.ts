import {
  Array,
  Clock,
  type Duration,
  Effect,
  HashMap,
  Layer,
  Option,
  Order,
  Predicate,
  Record,
  Schema,
  type Scope,
  Tuple,
  pipe,
} from 'effect'

import * as AsyncData from '../../asyncData/public.js'
import type { ValidateConstructionRequirements } from '../../block/scope.js'
import type * as Command from '../../command/index.js'
import type * as Interruptible from '../../command/interruptible/index.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../message/index.js'
import type { CompletedFetchOf, KeyedArgs } from './internal.js'
import { isFresh, resolveStaleTime } from './policy.js'
import type { QueryMessage } from './queryContract.js'

/** Schema fields whose encoding and decoding require no services. */
export type SyncFields = {
  readonly [x: PropertyKey]: Schema.Codec<unknown, unknown, never, never>
}

const canonicalizeJsonEntry = ([key, value]: readonly [
  string,
  Schema.Json,
]): readonly [string, Schema.Json] => [key, canonicalizeJson(value)]

const jsonEntryOrder = Order.mapInput(
  Order.String,
  ([key]: readonly [string, Schema.Json]) => key,
)

const isJsonObject = (value: Schema.Json): value is Schema.JsonObject =>
  Predicate.isObject(value) && !globalThis.Array.isArray(value)

const canonicalizeJson = (value: Schema.Json): Schema.Json => {
  if (globalThis.Array.isArray(value)) {
    return Array.map(value, canonicalizeJson)
  }

  if (isJsonObject(value)) {
    return pipe(
      value,
      Record.toEntries,
      Array.sort(jsonEntryOrder),
      Array.map(canonicalizeJsonEntry),
      Record.fromEntries,
    )
  }

  return value
}

const encodeJsonString = Schema.encodeUnknownSync(
  Schema.fromJsonString(Schema.Json),
)

const encodeKey = <A, I>(schema: Schema.Codec<A, I, never, never>) => {
  const encodeJson = Schema.encodeUnknownSync(Schema.toCodecJson(schema))

  return (value: A): string =>
    encodeJsonString(canonicalizeJson(encodeJson(value)))
}

/** Schemas, identity, and cache-key policy used to define a KeyedQuery. */
export type KeyedQueryConfig<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Notify extends boolean = false,
> = Readonly<{
  /** Block identity and prefix for the KeyedQuery's Fetch Command. */
  name: Name
  /** Schema for successfully fetched data. */
  data: Schema.Codec<A, AI, never, never>
  /** Schema for expected fetch failures retained in AsyncData. */
  error: Schema.Codec<E, EI, never, never>
  /** Schema fields for each fetch argument. */
  args: Fields
  /** Derives a stable cache key from decoded arguments. By default Foldkit
   * canonically JSON-encodes the declared argument Schema. */
  toKey?: (args: Schema.Schema.Type<Schema.Struct<Fields>>) => string
  /** Fresh lifetime after a successful completion. Defaults to Infinity.
   * Freshness-aware operations receive an Effect Clock timestamp explicitly. */
  staleTime?: Duration.Input
  /** Maximum settled entries retained by access/admission recency. Pending
   * entries are protected and may temporarily exceed this bound. */
  maxSettledEntries?: number
  /** Exposes accepted Fetch completions through an OutMessage contract. */
  notifyOnCompletion?: Notify
  execute?: never
}> &
  ([Notify] extends [true] ? Readonly<{ notifyOnCompletion: true }> : unknown)

type KeyedQueryFetchArgs<Fields extends SyncFields> = Readonly<{
  args: KeyedArgs<Fields>
  generation: number
  requestKey: string
}>

/** @internal Exact Fetch handler identity used by public KeyedQuery contracts. */
export type KeyedQueryFetchHandler<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = Command.Handler<
  `${Name}/Fetch`,
  KeyedQueryFetchArgs<Fields>,
  CompletedFetchOf<KeyedQueryMessage<A, AI, E, EI, Fields>>
>

/** @internal Exact Fetch definition contract shared by keyed Query authoring. */
export type KeyedQueryFetchCommand<
  FetchName extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = Interruptible.DefinitionWithArgs<
  FetchName,
  {
    readonly args: Schema.Struct<Fields>
    readonly generation: typeof Schema.Number
    readonly requestKey: typeof Schema.String
  },
  Readonly<{ generation: number; requestKey: string }>,
  Effect.Effect<
    CompletedFetchOf<KeyedQueryMessage<A, AI, E, EI, Fields>>,
    never,
    Command.Handler<
      FetchName,
      KeyedQueryFetchArgs<Fields>,
      CompletedFetchOf<KeyedQueryMessage<A, AI, E, EI, Fields>>
    >
  >
> &
  Readonly<{
    toLayer: Command.ToLayer<
      FetchName,
      KeyedQueryFetchArgs<Fields>,
      CompletedFetchOf<KeyedQueryMessage<A, AI, E, EI, Fields>>
    >
  }>

/** @internal Exact Fetch definition contract shared by keyed Query authoring. */
export type KeyedQueryFetchDefinition<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = KeyedQueryFetchCommand<`${Name}/Fetch`, A, AI, E, EI, Fields>

/** Builds a KeyedQuery fetch handler Layer from an Effect that constructs a fetch. */
export interface KeyedQueryToLayer<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> {
  <R, BuildE = never, BuildR = never>(
    build: Effect.Effect<
      (args: KeyedArgs<Fields>) => Effect.Effect<A, E, R>,
      BuildE,
      BuildR
    > &
      ValidateConstructionRequirements<BuildR>,
  ): Layer.Layer<
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>,
    BuildE,
    Exclude<R | BuildR, Scope.Scope>
  >
}

const withSynchronousCodec = <
  SchemaValue extends Schema.Codec<any, any, never, never>,
>(
  schema: SchemaValue,
): SchemaValue &
  Readonly<{ DecodingServices: never; EncodingServices: never }> => schema

const keyedQueryInputCases = { RequestedReset: {} }

const keyedQueryLocalCases = <A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) => ({
  RequestedRevalidation: { args: Args },
  RequestedRevalidationOrLoad: { args: Args },
  RequestedLoadIfMissing: { args: Args },
  RequestedLoadIfStale: { args: Args, nowMillis: Schema.Number },
  RequestedCancel: { args: Args },
  CompletedCancelFetch: {},
  CompletedFetch: {
    args: Args,
    generation: Schema.Number,
    requestKey: Schema.String,
    result: Schema.Result(data, error),
    completedAtMillis: Schema.optionalKey(Schema.Number),
  },
})

const makeKeyedQueryMessageSchema = <A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) =>
  withSynchronousCodec(
    defineMessageUnion({
      ...keyedQueryInputCases,
      ...keyedQueryLocalCases(data, error, Args),
    }),
  )

const makeKeyedQueryLocalMessageSchema = <
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) =>
  withSynchronousCodec(
    defineMessageUnion(keyedQueryLocalCases(data, error, Args)),
  )

/** Schema-backed local KeyedQuery completions and positional argument adapters. */
export interface KeyedQueryLocalMessage<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> extends ReturnType<
  typeof makeKeyedQueryLocalMessageSchema<A, AI, E, EI, Fields>
> {}

/** @internal Builds the local KeyedQuery Message contract without reset inputs. */
export const makeKeyedQueryLocalMessage = <
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
): KeyedQueryLocalMessage<A, AI, E, EI, Fields> =>
  makeKeyedQueryLocalMessageSchema(data, error, Args)

/** @internal Builds the parent-owned KeyedQuery reset request. */
export const makeKeyedQueryInMessage = () =>
  defineInMessageUnion(keyedQueryInputCases)

/** Schema-backed parent requests accepted by a KeyedQuery. */
export type KeyedQueryInMessage = ReturnType<typeof makeKeyedQueryInMessage>

/** @internal Constructors required by shared KeyedQuery transitions. */
export type KeyedQueryTransitionMessages<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = Pick<
  KeyedQueryMessage<A, AI, E, EI, Fields>,
  | 'RequestedRevalidation'
  | 'RequestedRevalidationOrLoad'
  | 'RequestedLoadIfMissing'
  | 'RequestedLoadIfStale'
  | 'RequestedCancel'
  | 'CompletedCancelFetch'
  | 'CompletedFetch'
>

/**
 * Schema-backed Message union for requested KeyedQuery operations and Fetch completions.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export interface KeyedQueryMessage<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> extends ReturnType<
  typeof makeKeyedQueryMessageSchema<A, AI, E, EI, Fields>
> {}

/** @internal Builds the canonical local KeyedQuery Message Schema before authoring. */
export const makeKeyedQueryMessage = <A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
): KeyedQueryMessage<A, AI, E, EI, Fields> =>
  makeKeyedQueryMessageSchema(data, error, Args)

/** @internal Builds the canonical accepted KeyedQuery completion OutMessage Schema. */
export const makeKeyedQueryOutMessage = <
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) =>
  defineMessageUnion({
    CompletedFetch: {
      args: Args,
      generation: Schema.Number,
      result: Schema.Result(data, error),
      completedAtMillis: Schema.optionalKey(Schema.Number),
    },
  })

/** Schema-backed notification for a KeyedQuery Fetch completion accepted by update. */
export type KeyedQueryOutMessage<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryOutMessage<A, AI, E, EI, Fields>>

/** Builds the Model Schema for a KeyedQuery. */
export const makeKeyedQueryModel = <A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
): KeyedQueryModel<A, AI, E, EI, Fields> => {
  const asyncData = AsyncData.Schema(data, error)

  return Schema.Struct({
    generation: Schema.Number,
    access: Schema.Number.pipe(
      Schema.withConstructorDefault(Effect.succeed(0)),
    ),
    entries: Schema.HashMap(
      Schema.String,
      Schema.Struct({
        args: Args,
        data: asyncData.schema,
        generation: Schema.Number,
        maybeCompletedAtMillis: Schema.Option(Schema.Number).pipe(
          Schema.withConstructorDefault(Effect.succeed(Option.none())),
        ),
        lastAccess: Schema.Number.pipe(
          Schema.withConstructorDefault(Effect.succeed(0)),
        ),
      }),
    ),
  })
}

/**
 * Model Schema for a KeyedQuery containing retained `AsyncData` entries.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export interface KeyedQueryModel<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> extends Schema.Struct<
  Readonly<{
    generation: typeof Schema.Number
    access: Schema.withConstructorDefault<typeof Schema.Number>
    entries: Schema.HashMap<
      typeof Schema.String,
      Schema.Struct<
        Readonly<{
          args: Schema.Struct<Fields>
          data: Schema.Codec<
            AsyncData.AsyncData<A, E>,
            AsyncData.AsyncDataEncoded<AI, EI>,
            never,
            never
          >
          generation: typeof Schema.Number
          maybeCompletedAtMillis: Schema.withConstructorDefault<
            Schema.Option<typeof Schema.Number>
          >
          lastAccess: Schema.withConstructorDefault<typeof Schema.Number>
        }>
      >
    >
  }>
> {}

/** @internal Exact operation constructors and tuple-producing keyed adapters. */
export type KeyedQueryOperationDeclarations<Fields extends SyncFields> =
  Readonly<{
    readonly requestRevalidation: (
      args: KeyedArgs<Fields>,
    ) => [
      KeyedQueryMessage<
        never,
        never,
        never,
        never,
        Fields
      >['RequestedRevalidation']['Type'],
    ]
    readonly requestRevalidationOrLoad: (
      args: KeyedArgs<Fields>,
    ) => [
      KeyedQueryMessage<
        never,
        never,
        never,
        never,
        Fields
      >['RequestedRevalidationOrLoad']['Type'],
    ]
    readonly requestLoadIfMissing: (
      args: KeyedArgs<Fields>,
    ) => [
      KeyedQueryMessage<
        never,
        never,
        never,
        never,
        Fields
      >['RequestedLoadIfMissing']['Type'],
    ]
    readonly requestLoadIfStale: (
      args: KeyedArgs<Fields>,
      nowMillis: number,
    ) => [
      KeyedQueryMessage<
        never,
        never,
        never,
        never,
        Fields
      >['RequestedLoadIfStale']['Type'],
    ]
    readonly requestCancel: (
      args: KeyedArgs<Fields>,
    ) => [
      KeyedQueryMessage<
        never,
        never,
        never,
        never,
        Fields
      >['RequestedCancel']['Type'],
    ]
    readonly requestReset: QueryMessage<
      never,
      never,
      never,
      never
    >['RequestedReset']
  }>

/** @internal Declares every KeyedQuery operation from its canonical local Messages. */
export const makeKeyedQueryArgumentOperations = <
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  Message: KeyedQueryTransitionMessages<A, AI, E, EI, Fields>,
): Omit<KeyedQueryOperationDeclarations<Fields>, 'requestReset'> => ({
  requestRevalidation: (args: KeyedArgs<Fields>) =>
    Tuple.make(Message.RequestedRevalidation({ args })),
  requestRevalidationOrLoad: (args: KeyedArgs<Fields>) =>
    Tuple.make(Message.RequestedRevalidationOrLoad({ args })),
  requestLoadIfMissing: (args: KeyedArgs<Fields>) =>
    Tuple.make(Message.RequestedLoadIfMissing({ args })),
  requestLoadIfStale: (args: KeyedArgs<Fields>, nowMillis: number) =>
    Tuple.make(Message.RequestedLoadIfStale({ args, nowMillis })),
  requestCancel: (args: KeyedArgs<Fields>) =>
    Tuple.make(Message.RequestedCancel({ args })),
})

/** @internal Declares native keyed operations with the same argument adapters. */
export const makeKeyedQueryOperations = <
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  Message: KeyedQueryMessage<A, AI, E, EI, Fields>,
): KeyedQueryOperationDeclarations<Fields> => ({
  ...makeKeyedQueryArgumentOperations(Message),
  requestReset: Message.RequestedReset,
})

/** @internal Pure keyed reads and canonical argument identity helpers. */
export interface KeyedQueryAccessors<Model, Args, A, E> {
  readonly read: (model: Model, args: Args) => AsyncData.AsyncData<A, E>
  readonly isFresh: (model: Model, args: Args, nowMillis: number) => boolean
  readonly pendingArgs: (model: Model) => ReadonlyArray<Args>
  readonly argsToKey: (args: Args) => string
  readonly snapshotArgs: (args: Args) => Args
}

/** @internal Builds keyed reads from the declared argument and cache contracts. */
export const makeKeyedQueryAccessors = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, boolean>,
  Args: Schema.Struct<Fields>,
): KeyedQueryAccessors<
  KeyedQueryModel<A, AI, E, EI, Fields>['Type'],
  KeyedArgs<Fields>,
  A,
  E
> => {
  type Model = KeyedQueryModel<A, AI, E, EI, Fields>['Type']
  type Args = KeyedArgs<Fields>
  type EntryData = AsyncData.AsyncData<A, E>

  if (Array.isArrayEmpty(Record.keys(config.args))) {
    throw new Error(
      `Query.define("${config.name}"): keyed args must include at least one field`,
    )
  }

  const argsToKey = config.toKey ?? encodeKey(Args)
  const staleTimeMillis = resolveStaleTime(config.name, config.staleTime)
  const { maxSettledEntries } = config

  if (
    maxSettledEntries !== undefined &&
    (!globalThis.Number.isSafeInteger(maxSettledEntries) ||
      maxSettledEntries < 1)
  ) {
    throw new Error(
      `Query.define("${config.name}"): maxSettledEntries must be a positive safe integer`,
    )
  }

  const encodeArgs = Schema.encodeSync(Args)
  const decodeArgs = Schema.decodeSync(Args)
  const snapshotArgs = (args: Args): Args => decodeArgs(encodeArgs(args))
  const read = (model: Model, args: Args): EntryData =>
    AsyncData.fromOptionOrIdle(
      Option.map(
        HashMap.get(model.entries, argsToKey(args)),
        entry => entry.data,
      ),
    )
  const isEntryFresh = (
    model: Model,
    args: Args,
    nowMillis: number,
  ): boolean => {
    const maybeEntry = HashMap.get(model.entries, argsToKey(args))

    return isFresh(
      Option.match(maybeEntry, {
        onNone: AsyncData.Idle,
        onSome: entry => entry.data,
      }),
      Option.flatMap(maybeEntry, entry => entry.maybeCompletedAtMillis),
      nowMillis,
      staleTimeMillis,
    )
  }
  const pendingArgs = (model: Model): ReadonlyArray<Args> =>
    pipe(
      HashMap.values(model.entries),
      Array.fromIterable,
      Array.filter(entry => AsyncData.isPending(entry.data)),
      Array.map(entry => snapshotArgs(entry.args)),
    )

  return { read, isFresh: isEntryFresh, pendingArgs, argsToKey, snapshotArgs }
}

/** @internal Fetch execution and provider recipes independent of keyed transitions. */
export interface KeyedQueryFetchApi<Args, A, E, Requirements> {
  readonly run: (
    args: Args,
  ) => Effect.Effect<AsyncData.AsyncData<A, E>, never, Requirements>
  readonly toLayer: <
    HandlerRequirements,
    BuildError = never,
    BuildRequirements = never,
  >(
    build: Effect.Effect<
      (args: Args) => Effect.Effect<A, E, HandlerRequirements>,
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

/** @internal Builds fetch recipes around the exact registered keyed Fetch identity. */
export const makeKeyedQueryFetchApi = <
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  FetchName extends string,
>(
  Message: KeyedQueryTransitionMessages<A, AI, E, EI, Fields>,
  Fetch: KeyedQueryFetchCommand<FetchName, A, AI, E, EI, Fields>,
  accessors: Pick<
    KeyedQueryAccessors<never, KeyedArgs<Fields>, A, E>,
    'argsToKey' | 'snapshotArgs'
  >,
): KeyedQueryFetchApi<
  KeyedArgs<Fields>,
  A,
  E,
  Command.HandlerOf<KeyedQueryFetchCommand<FetchName, A, AI, E, EI, Fields>>
> => {
  type Args = KeyedArgs<Fields>
  const { argsToKey, snapshotArgs } = accessors

  const run = (args: Args) => {
    const requestArgs = snapshotArgs(args)
    const requestKey = argsToKey(requestArgs)

    return pipe(
      Fetch({ args: requestArgs, generation: 0, requestKey }).effect,
      Effect.map(({ result }) => AsyncData.settle(AsyncData.Loading(), result)),
    )
  }
  const toLayer = <HandlerR, BuildE = never, BuildR = never>(
    build: Effect.Effect<
      (args: KeyedArgs<Fields>) => Effect.Effect<A, E, HandlerR>,
      BuildE,
      BuildR
    > &
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
          ({ args, generation, requestKey }: KeyedQueryFetchArgs<Fields>) =>
            pipe(
              execute(args),
              Effect.result,
              Effect.flatMap(result =>
                Effect.map(Clock.currentTimeMillis, completedAtMillis =>
                  Message.CompletedFetch({
                    args,
                    generation,
                    requestKey,
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

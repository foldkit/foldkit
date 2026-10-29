import {
  Array,
  Clock,
  type Duration,
  Effect,
  Function,
  HashMap,
  Layer,
  Number,
  Option,
  Order,
  Predicate,
  Record,
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
import type * as Interruptible from '../../command/interruptible/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import {
  type AsyncDataTransition,
  type CompletedFetchOf,
  type KeyedArgs,
} from './internal.js'
import { cancelData, isFresh, resolveStaleTime } from './policy.js'

type AnyLayer =
  | Layer.Layer<never, unknown, unknown>
  | Layer.Layer<unknown, unknown, unknown>

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

type KeyedQueryFetchHandler<
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

type KeyedQueryFetchDefinition<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = Interruptible.DefinitionWithArgs<
  `${Name}/Fetch`,
  {
    readonly args: Schema.Struct<Fields>
    readonly generation: typeof Schema.Number
    readonly requestKey: typeof Schema.String
  },
  Readonly<{ generation: number; requestKey: string }>,
  Effect.Effect<
    CompletedFetchOf<KeyedQueryMessage<A, AI, E, EI, Fields>>,
    never,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
> &
  Readonly<{
    toLayer: Command.ToLayer<
      `${Name}/Fetch`,
      KeyedQueryFetchArgs<Fields>,
      CompletedFetchOf<KeyedQueryMessage<A, AI, E, EI, Fields>>
    >
  }>

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

const makeKeyedQueryMessage = <A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) =>
  defineMessageUnion({
    RequestedReset: {},
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

/**
 * Schema-backed Message union for requested KeyedQuery operations and Fetch completions.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type KeyedQueryMessage<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryMessage<A, AI, E, EI, Fields>>

const makeKeyedQueryOutMessage = <A, AI, E, EI, Fields extends SyncFields>(
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
            AsyncData.AsyncDataEncoded<AI, EI>
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

const makeKeyedQueryApi = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Fetch extends KeyedQueryFetchDefinition<Name, A, AI, E, EI, Fields>,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, boolean>,
  Args: Schema.Struct<Fields>,
  Model: KeyedQueryModel<A, AI, E, EI, Fields>,
  Message: KeyedQueryMessage<A, AI, E, EI, Fields>,
  Fetch: Fetch,
) => {
  const asyncData = AsyncData.Schema(config.data, config.error)
  const OutMessage = makeKeyedQueryOutMessage(config.data, config.error, Args)
  type EntryData = typeof asyncData.schema.Type
  type Args = KeyedArgs<Fields>
  type Model = typeof Model.Type
  type Message = typeof Message.Type
  type UpdateReturn = Update.Return<
    Model,
    Message,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  type PureUpdateReturn = Update.Return<Model, Message>

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
  const init = () => ({
    model: Model.make({ entries: HashMap.empty(), generation: 0, access: 0 }),
  })
  const reset = (model: Model): PureUpdateReturn => ({
    model: modifyFields(model, { entries: () => HashMap.empty() }),
  })
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
  const trim = (model: Model): Model => {
    if (maxSettledEntries === undefined) {
      return model
    }

    const settled = pipe(
      HashMap.toEntries(model.entries),
      Array.filter(([, entry]) => !AsyncData.isPending(entry.data)),
      Array.sort(Order.mapInput(Order.Number, ([, entry]) => entry.lastAccess)),
    )
    const excess = settled.length - maxSettledEntries

    if (excess <= 0) {
      return model
    }

    const keys = pipe(
      settled,
      Array.take(excess),
      Array.map(([key]) => key),
    )

    return modifyFields(model, { entries: HashMap.removeMany(keys) })
  }
  const touch = (model: Model, requestKey: string): Model => {
    if (maxSettledEntries === undefined) {
      return model
    }

    return Option.match(HashMap.get(model.entries, requestKey), {
      onNone: () => model,
      onSome: entry => {
        const nextAccess = model.access + 1

        return modifyFields(model, {
          access: () => nextAccess,
          entries: HashMap.set(
            requestKey,
            modifyFields(entry, {
              lastAccess: () => nextAccess,
            }),
          ),
        })
      },
    })
  }
  const liftTransition = (
    transition: AsyncDataTransition,
  ): Update.Fold<
    Model,
    Message,
    Args,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  > =>
    Function.dual(2, (model: Model, args: Args): UpdateReturn => {
      const requestKey = argsToKey(args)

      return Option.match(transition(read(model, args)), {
        onNone: () => ({ model: touch(model, requestKey) }),
        onSome: nextData => {
          const storedArgs = snapshotArgs(args)
          const storedKey = argsToKey(storedArgs)
          const nextGeneration = Number.increment(model.generation)
          const maybeCompletedAtMillis = pipe(
            HashMap.get(model.entries, storedKey),
            Option.flatMap(entry => entry.maybeCompletedAtMillis),
          )
          const started = modifyFields(model, {
            entries: HashMap.set(storedKey, {
              args: storedArgs,
              data: nextData,
              generation: nextGeneration,
              maybeCompletedAtMillis,
              lastAccess: model.access,
            }),
            generation: () => nextGeneration,
          })

          return {
            model: touch(started, storedKey),
            commands: [
              Fetch({
                args: snapshotArgs(storedArgs),
                generation: nextGeneration,
                requestKey: storedKey,
              }),
            ],
          }
        },
      })
    })
  const revalidate = liftTransition(AsyncData.revalidate)
  const revalidateOrLoad = liftTransition(AsyncData.revalidateOrLoad)
  const loadIfMissing = liftTransition(AsyncData.loadIfMissing)
  const loadIfStale = (
    model: Model,
    args: Args,
    nowMillis: number,
  ): UpdateReturn =>
    isEntryFresh(model, args, nowMillis)
      ? { model: touch(model, argsToKey(args)) }
      : revalidateOrLoad(model, args)
  const cancel = (model: Model, args: Args): PureUpdateReturn => {
    const requestKey = argsToKey(args)
    const maybeEntry = HashMap.get(model.entries, requestKey)

    if (
      Option.isNone(maybeEntry) ||
      !AsyncData.isPending(maybeEntry.value.data)
    ) {
      return { model }
    }

    const entry = maybeEntry.value
    const nextGeneration = model.generation + 1
    const nextEntries = AsyncData.isLoading(entry.data)
      ? HashMap.remove(model.entries, requestKey)
      : HashMap.set(
          model.entries,
          requestKey,
          modifyFields(entry, {
            data: cancelData,
            generation: () => nextGeneration,
          }),
        )

    return {
      model: trim(
        modifyFields(model, {
          generation: () => nextGeneration,
          entries: () => nextEntries,
        }),
      ),
      commands: [
        Fetch.Interrupt({ requestKey, generation: entry.generation }, () =>
          Message.CompletedCancelFetch(),
        ),
      ],
    }
  }
  const settle = (
    model: Model,
    {
      generation,
      requestKey,
      result,
      completedAtMillis,
    }: typeof Message.CompletedFetch.Type,
  ): Option.Option<Readonly<{ model: Model; args: Args }>> => {
    const maybeEntry = HashMap.get(model.entries, requestKey)

    if (Option.isNone(maybeEntry)) {
      return Option.none()
    }

    const entry = maybeEntry.value

    if (!AsyncData.isPending(entry.data) || generation !== entry.generation) {
      return Option.none()
    }

    const completed = modifyFields(model, {
      entries: HashMap.set(
        requestKey,
        modifyFields(entry, {
          data: () => AsyncData.settle(entry.data, result),
          maybeCompletedAtMillis: previous =>
            Result.isSuccess(result)
              ? Option.fromNullishOr(completedAtMillis)
              : previous,
        }),
      ),
    })

    return Option.some({
      model: trim(touch(completed, requestKey)),
      args: entry.args,
    })
  }
  const updateHandlers = {
    RequestedReset: (model: Model) => reset(model),
    RequestedRevalidation: (
      model: Model,
      { args }: typeof Message.RequestedRevalidation.Type,
    ) => revalidate(model, args),
    RequestedRevalidationOrLoad: (
      model: Model,
      { args }: typeof Message.RequestedRevalidationOrLoad.Type,
    ) => revalidateOrLoad(model, args),
    RequestedLoadIfMissing: (
      model: Model,
      { args }: typeof Message.RequestedLoadIfMissing.Type,
    ) => loadIfMissing(model, args),
    RequestedLoadIfStale: (
      model: Model,
      { args, nowMillis }: typeof Message.RequestedLoadIfStale.Type,
    ) => loadIfStale(model, args, nowMillis),
    RequestedCancel: (
      model: Model,
      { args }: typeof Message.RequestedCancel.Type,
    ) => cancel(model, args),
    CompletedCancelFetch: (model: Model) => ({ model }),
    CompletedFetch: (
      model: Model,
      message: typeof Message.CompletedFetch.Type,
    ): PureUpdateReturn =>
      Option.match(settle(model, message), {
        onNone: () => ({ model }),
        onSome: completed => ({ model: completed.model }),
      }),
  }
  const notifyingUpdateHandlers = {
    ...updateHandlers,
    CompletedFetch: (
      model: Model,
      message: typeof Message.CompletedFetch.Type,
    ): Update.ReturnWithOutMessage<Model, Message, typeof OutMessage.Type> =>
      Option.match(settle(model, message), {
        onNone: () => ({ model }),
        onSome: completed => ({
          model: completed.model,
          outMessage: OutMessage.CompletedFetch({
            args: snapshotArgs(completed.args),
            generation: message.generation,
            result: message.result,
            ...(message.completedAtMillis === undefined
              ? {}
              : { completedAtMillis: message.completedAtMillis }),
          }),
        }),
      }),
  }
  const operations = {
    requestRevalidation: (args: Args) =>
      Tuple.make(Message.RequestedRevalidation({ args })),
    requestRevalidationOrLoad: (args: Args) =>
      Tuple.make(Message.RequestedRevalidationOrLoad({ args })),
    requestLoadIfMissing: (args: Args) =>
      Tuple.make(Message.RequestedLoadIfMissing({ args })),
    requestLoadIfStale: (args: Args, nowMillis: number) =>
      Tuple.make(Message.RequestedLoadIfStale({ args, nowMillis })),
    requestCancel: (args: Args) =>
      Tuple.make(Message.RequestedCancel({ args })),
  }
  const run = (args: Args) => {
    const requestArgs = snapshotArgs(args)
    const requestKey = argsToKey(requestArgs)

    return pipe(
      Fetch({ args: requestArgs, generation: 0, requestKey }).effect,
      Effect.map(({ result }) => AsyncData.settle(AsyncData.Loading(), result)),
    )
  }
  const toLayer: KeyedQueryToLayer<Name, A, AI, E, EI, Fields> = <
    HandlerR,
    BuildE = never,
    BuildR = never,
  >(
    build: Effect.Effect<
      (args: KeyedArgs<Fields>) => Effect.Effect<A, E, HandlerR>,
      BuildE,
      BuildR
    > &
      ValidateConstructionRequirements<BuildR>,
  ) =>
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

  return {
    init,
    reset,
    read,
    isFresh: isEntryFresh,
    pendingArgs,
    OutMessage,
    updateHandlers,
    notifyingUpdateHandlers,
    operations,
    revalidate,
    revalidateOrLoad,
    loadIfMissing,
    run,
    toLayer,
  }
}

// oxlint-disable effecttsgo/any-unknown-in-error-context
const enrichKeyedQuery = <
  BlockValue extends Block.AnyBlock,
  Fetch,
  Read,
  IsFresh,
  PendingArgs,
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
    pendingArgs: PendingArgs
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
    pendingArgs: api.pendingArgs,
    run: api.run,
    toLayer: api.toLayer,
    ...api.operations,
    replaceEffectsLayer: <EffectsLayer extends AnyLayer>(
      EffectsLayer: EffectsLayer,
    ) => enrichKeyedQuery(replaceEffectsLayer(EffectsLayer), api),
    provideHandlers: <HandlersLayer extends AnyLayer>(
      HandlersLayer: HandlersLayer,
    ) => enrichKeyedQuery(provideHandlers(HandlersLayer), api),
  })
}
// oxlint-enable effecttsgo/any-unknown-in-error-context

type KeyedQueryModelType<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = KeyedQueryModel<A, AI, E, EI, Fields>['Type']

type KeyedQueryMessageType<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = KeyedQueryMessage<A, AI, E, EI, Fields>['Type']

type KeyedQueryExposedOperations<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = Readonly<{
  /** Clears every cached entry without starting a fetch. */
  requestReset: Update.Step<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Starts a fetch for `Success` or `Stale` data at the selected key while
   * retaining that data. Other states and a missing entry remain unchanged. */
  requestRevalidation: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => Update.Return<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Revalidates retained data and starts an initial or retry fetch when the
   * selected key has no successful data. */
  requestRevalidationOrLoad: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => Update.Return<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Starts a fetch when the selected key has no cache entry or is in
   * `Failure`. Loaded and pending entries remain unchanged. */
  requestLoadIfMissing: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => Update.Return<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Uses retained data while fresh; otherwise starts a load or refresh.
   * nowMillis comes from Effect Clock through an application Message. */
  requestLoadIfStale: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
    nowMillis: number,
  ) => Update.Return<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Invalidates and interrupts the pending generation at one key. A canceled
   * refresh restores retained data, subject to the settled-entry limit. */
  requestCancel: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => Update.Return<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>
  >
}>

type KeyedQueryImplementation<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
  Notify extends boolean,
> = Readonly<{
  init: () => Readonly<{
    model: KeyedQueryModelType<A, AI, E, EI, Fields>
  }>
  update: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
    message: KeyedQueryMessageType<A, AI, E, EI, Fields>,
  ) => Notify extends true
    ? Update.ReturnWithOutMessage<
        KeyedQueryModelType<A, AI, E, EI, Fields>,
        KeyedQueryMessageType<A, AI, E, EI, Fields>,
        KeyedQueryOutMessage<A, AI, E, EI, Fields>['Type'],
        KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
      >
    : Update.Return<
        KeyedQueryModelType<A, AI, E, EI, Fields>,
        KeyedQueryMessageType<A, AI, E, EI, Fields>,
        KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
      >
  operations: KeyedQueryExposedOperations<Name, A, AI, E, EI, Fields>
  EffectsLayer: EffectsLayer
  hostHandlers: HostHandlers
}>

type KeyedQueryConveniences<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = Readonly<{
  /** Fetch Command definition owned by this KeyedQuery Block. */
  Fetch: KeyedQueryFetchDefinition<Name, A, AI, E, EI, Fields>
  /** Reads AsyncData for one argument key without exposing the Query Model
   * shape. A missing key returns Idle. */
  read: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => AsyncData.AsyncData<A, E>
  /** Runs the fetch handler directly for one set of arguments and returns
   * settled AsyncData. */
  run: (
    args: KeyedArgs<Fields>,
  ) => Effect.Effect<
    AsyncData.AsyncData<A, E>,
    never,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Builds a handler Layer from an Effect that constructs the keyed fetch
   * function. */
  toLayer: KeyedQueryToLayer<Name, A, AI, E, EI, Fields>
  /** Clears every cached entry without starting a fetch. */
  requestReset: Update.Step<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Starts a fetch for `Success` or `Stale` data at the selected key while
   * retaining that data. Other states and a missing entry remain unchanged. */
  requestRevalidation: Update.Fold<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedArgs<Fields>,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Revalidates retained data or starts an initial or retry fetch for the
   * selected key. */
  requestRevalidationOrLoad: Update.Fold<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedArgs<Fields>,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Starts a fetch when the selected key has no cache entry or is in
   * `Failure`. Loaded and pending entries remain unchanged. */
  requestLoadIfMissing: Update.Fold<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedArgs<Fields>,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  >
  /** Checks freshness without changing recency or reading the wall clock. */
  isFresh: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
    nowMillis: number,
  ) => boolean
  /** Detached argument snapshots for currently pending entries. */
  pendingArgs: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
  ) => ReadonlyArray<KeyedArgs<Fields>>
  /** Freshness-aware load, with data-first or data-last calling convention. */
  requestLoadIfStale: {
    (
      model: KeyedQueryModelType<A, AI, E, EI, Fields>,
      args: KeyedArgs<Fields>,
      nowMillis: number,
    ): Update.Return<
      KeyedQueryModelType<A, AI, E, EI, Fields>,
      KeyedQueryMessageType<A, AI, E, EI, Fields>,
      KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
    >
    (
      args: KeyedArgs<Fields>,
      nowMillis: number,
    ): Update.Step<
      KeyedQueryModelType<A, AI, E, EI, Fields>,
      KeyedQueryMessageType<A, AI, E, EI, Fields>,
      KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
    >
  }
  /** Cancels one pending key. Restoring a refresh applies the settled-entry
   * limit and may evict retained data; other pending keys are unaffected. */
  requestCancel: Update.Fold<
    KeyedQueryModelType<A, AI, E, EI, Fields>,
    KeyedQueryMessageType<A, AI, E, EI, Fields>,
    KeyedArgs<Fields>
  >
}>

type MergeLayers<Left extends AnyLayer, Right extends AnyLayer> = Layer.Layer<
  Layer.Success<Left | Right>,
  Layer.Error<Left | Right>,
  Layer.Services<Left | Right>
>

type KeyedQueryBlockBase<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
  Notify extends boolean,
> = Block.Block<
  Block.Owner<Name, false>,
  KeyedQueryModel<A, AI, E, EI, Fields>,
  KeyedQueryMessage<A, AI, E, EI, Fields>,
  Notify extends true ? KeyedQueryOutMessage<A, AI, E, EI, Fields> : undefined,
  readonly [],
  readonly [],
  KeyedQueryImplementation<
    Name,
    A,
    AI,
    E,
    EI,
    Fields,
    EffectsLayer,
    HostHandlers,
    Notify
  >
>

type KeyedQueryShape<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
  Notify extends boolean,
> = Omit<
  KeyedQueryBlockBase<
    Name,
    A,
    AI,
    E,
    EI,
    Fields,
    EffectsLayer,
    HostHandlers,
    Notify
  >,
  'replaceEffectsLayer' | 'provideHandlers'
> &
  KeyedQueryConveniences<Name, A, AI, E, EI, Fields> &
  Readonly<{
    /** Replaces the KeyedQuery's complete local fetch handler recipe. */
    replaceEffectsLayer: <SelectedEffectsLayer extends AnyLayer>(
      EffectsLayer: SelectedEffectsLayer &
        NoInfer<
          Block.ValidateConcreteComposition<
            KeyedQueryBlockBase<
              Name,
              A,
              AI,
              E,
              EI,
              Fields,
              SelectedEffectsLayer,
              HostHandlers,
              Notify
            >
          >
        >,
    ) => KeyedQuery<
      Name,
      A,
      AI,
      E,
      EI,
      Fields,
      SelectedEffectsLayer,
      HostHandlers,
      Notify
    >
    /** Supplies the host-provided Fetch handler and returns a complete
     * KeyedQuery. */
    provideHandlers: HostHandlers extends readonly [
      KeyedQueryFetchDefinition<Name, A, AI, E, EI, Fields>,
    ]
      ? <HandlerError, HandlerRequirements>(
          HandlersLayer: Layer.Layer<
            KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>,
            HandlerError,
            HandlerRequirements
          >,
        ) => KeyedQuery<
          Name,
          A,
          AI,
          E,
          EI,
          Fields,
          MergeLayers<
            EffectsLayer,
            Layer.Layer<
              KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>,
              HandlerError,
              HandlerRequirements
            >
          >,
          readonly [],
          Notify
        >
      : never
  }>

/** Named completed KeyedQuery contract with accepted-completion OutMessages. */
export interface KeyedQueryWithOutMessage<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
> extends KeyedQueryShape<
  Name,
  A,
  AI,
  E,
  EI,
  Fields,
  EffectsLayer,
  HostHandlers,
  true
> {}

/** Named completed KeyedQuery contract without a completion OutMessage contract. */
export interface KeyedQueryWithoutOutMessage<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
> extends KeyedQueryShape<
  Name,
  A,
  AI,
  E,
  EI,
  Fields,
  EffectsLayer,
  HostHandlers,
  false
> {}

/**
 * Viewless Block for fetching and retaining `AsyncData` values by cache key.
 *
 * A KeyedQuery is one Block. Its cache entries are Model data, not keyed Block
 * instances. The Effects Layer and host handler parameters describe handler
 * assembly. The final parameter selects the completion OutMessage contract.
 * Defaults describe a host-provided Query without completion notifications.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type KeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  EffectsLayer extends AnyLayer = Layer.Layer<never, never, never>,
  HostHandlers extends ReadonlyArray<unknown> = readonly [
    KeyedQueryFetchDefinition<Name, A, AI, E, EI, Fields>,
  ],
  Notify extends boolean = false,
> = Notify extends true
  ? KeyedQueryWithOutMessage<
      Name,
      A,
      AI,
      E,
      EI,
      Fields,
      EffectsLayer,
      HostHandlers
    >
  : KeyedQueryWithoutOutMessage<
      Name,
      A,
      AI,
      E,
      EI,
      Fields,
      EffectsLayer,
      HostHandlers
    >

const makeKeyedQueryParts = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, boolean>,
) => {
  const Args = Schema.Struct(config.args)
  const Model = makeKeyedQueryModel(config.data, config.error, Args)
  const Message = makeKeyedQueryMessage(config.data, config.error, Args)
  const QueryNamespace = Block.makeNamespace(config.name)
  const Fetch = QueryNamespace.makeCommand('Fetch', {
    args: {
      args: Args,
      generation: Schema.Number,
      requestKey: Schema.String,
    },
    messages: [Message.CompletedFetch],
    interrupt: {
      keyFields: ['requestKey', 'generation'],
      toKey: ({ requestKey, generation }) =>
        JSON.stringify([requestKey, generation]),
    },
  })
  const api = makeKeyedQueryApi(config, Args, Model, Message, Fetch)
  const enrich = <
    BlockValue extends Block.AnyBlock &
      Readonly<{
        operations: KeyedQueryExposedOperations<Name, A, AI, E, EI, Fields>
      }>,
  >(
    block: BlockValue,
  ) =>
    enrichKeyedQuery(block, {
      Fetch,
      read: api.read,
      isFresh: api.isFresh,
      pendingArgs: api.pendingArgs,
      run: api.run,
      toLayer: api.toLayer,
      operations: {
        requestReset: block.operations.requestReset,
        requestRevalidation: Function.dual(
          2,
          block.operations.requestRevalidation,
        ),
        requestRevalidationOrLoad: Function.dual(
          2,
          block.operations.requestRevalidationOrLoad,
        ),
        requestLoadIfMissing: Function.dual(
          2,
          block.operations.requestLoadIfMissing,
        ),
        requestLoadIfStale: Function.dual(
          3,
          block.operations.requestLoadIfStale,
        ),
        requestCancel: Function.dual(2, block.operations.requestCancel),
      },
    })
  const makePlain = (): LayeredKeyedQuery<Name, A, AI, E, EI, Fields> => {
    const QueryDefinition = QueryNamespace.makeDefinition({ Model, Message })
    const QueryComposition = QueryDefinition.makeComposition()
    const init = QueryComposition.makeInit(api.init)
    const prepare = () =>
      QueryComposition.prepareBlock({
        init,
        update: QueryComposition.makeUpdate(api.updateHandlers),
        operations: {
          ...api.operations,
          requestReset: Message.RequestedReset,
        },
        EffectsLayer: Layer.empty,
        hostHandlers: [Fetch],
      })
    const block: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)

    return enrich(block)
  }
  const makeNotifying = (): LayeredKeyedQuery<
    Name,
    A,
    AI,
    E,
    EI,
    Fields,
    true
  > => {
    const QueryDefinition = QueryNamespace.makeDefinition({
      Model,
      Message,
      OutMessage: api.OutMessage,
    })
    const QueryComposition = QueryDefinition.makeComposition()
    const init = QueryComposition.makeInit(api.init)
    const prepare = () =>
      QueryComposition.prepareBlock({
        init,
        update: QueryComposition.makeUpdate(api.notifyingUpdateHandlers),
        operations: {
          ...api.operations,
          requestReset: Message.RequestedReset,
        },
        EffectsLayer: Layer.empty,
        hostHandlers: [Fetch],
      })
    const block: Block.FromAssemblyWithOutMessage<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)

    return enrich(block)
  }

  return { makePlain, makeNotifying }
}

/** A KeyedQuery whose fetch definition can be supplied through Block handler assembly. */
export type LayeredKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Notify extends boolean = false,
> = KeyedQuery<
  Name,
  A,
  AI,
  E,
  EI,
  Fields,
  Layer.Layer<never, never, never>,
  readonly [KeyedQueryFetchDefinition<Name, A, AI, E, EI, Fields>],
  Notify
>

/** @internal Exact completed Block type for a KeyedQuery with a canonical handler. */
export type CanonicalKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
  Notify extends boolean = false,
> = KeyedQuery<
  Name,
  A,
  AI,
  E,
  EI,
  Fields,
  Layer.Layer<
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>,
    BuildError,
    Exclude<HandlerRequirements | BuildRequirements, Scope.Scope>
  >,
  readonly [],
  Notify
>

export function defineKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  const Notify extends boolean = false,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, Notify>,
): LayeredKeyedQuery<Name, A, AI, E, EI, Fields, Notify>
export function defineKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
  const Notify extends boolean = false,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, Notify>,
  handler: Effect.Effect<
    (args: KeyedArgs<Fields>) => Effect.Effect<A, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
): CanonicalKeyedQuery<
  Name,
  A,
  AI,
  E,
  EI,
  Fields,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
  Notify
>
export function defineKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, boolean>,
  handler?: Effect.Effect<
    (args: KeyedArgs<Fields>) => Effect.Effect<A, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
): unknown {
  const parts = makeKeyedQueryParts(config)
  const query =
    config.notifyOnCompletion === true
      ? parts.makeNotifying()
      : parts.makePlain()

  if (handler === undefined) {
    return query
  }

  return query.provideHandlers(query.toLayer(handler))
}

import {
  Array,
  Clock,
  type Duration,
  Effect,
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
  type KeyedArgs,
  type QueryFetcher,
  makeFetcher,
  makeFetcherLayer,
  runWhileHoldingKey,
} from './internal.js'
import { cancelData, isFresh, resolveStaleTime } from './policy.js'

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
  /** Block id and prefix for the KeyedQuery's Fetch and CancelFetch Commands. */
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
   * Freshness-aware Messages carry an Effect Clock timestamp explicitly. */
  staleTime?: Duration.Input
  /** Maximum settled entries retained by access/admission recency. Pending
   * entries are protected and may temporarily exceed this bound. */
  maxSettledEntries?: number
  /** Reports accepted Fetch completions through the `CompletedFetch` OutMessage. */
  notifyOnCompletion?: Notify
}> &
  ([Notify] extends [true] ? Readonly<{ notifyOnCompletion: true }> : unknown)

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

/** Constructor args for a KeyedQuery instance. Pass `{}` for an empty cache. */
export type KeyedQueryArgs<Fields extends SyncFields> = Readonly<{
  /** Starts a fetch for each of these args when the instance enters its
   *  parent's Model. */
  loadOnStart?: ReadonlyArray<KeyedArgs<Fields>>
}>

/** @internal The pure policy of a KeyedQuery: its Schemas, Commands, and the
 *  transitions its update handlers apply. */
export const makeKeyedQueryPolicy = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, boolean>,
) => {
  if (Array.isArrayEmpty(Record.keys(config.args))) {
    throw new Error(
      `Query.define("${config.name}"): keyed args must include at least one field`,
    )
  }

  const Args = Schema.Struct(config.args)
  const Model = makeKeyedQueryModel(config.data, config.error, Args)
  const Message = makeKeyedQueryMessage(config.data, config.error, Args)
  const OutMessage = makeKeyedQueryOutMessage(config.data, config.error, Args)
  const asyncData = AsyncData.Schema(config.data, config.error)
  type EntryData = typeof asyncData.schema.Type
  type Args = KeyedArgs<Fields>
  type Model = typeof Model.Type
  type Message = typeof Message.Type

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

  const Fetch = Command.define(`${config.name}/Fetch`, {
    args: {
      args: Args,
      generation: Schema.Number,
      requestKey: Schema.String,
    },
    messages: [Message.CompletedFetch],
  })
  const CancelFetch = Command.define(`${config.name}/CancelFetch`, {
    args: { requestKey: Schema.String, generation: Schema.Number },
    messages: [Message.CompletedCancelFetch],
  })
  const Fetcher = makeFetcher<Name, (args: Args) => Effect.Effect<A, E>>(
    config.name,
  )

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

  const fetchKey = (requestKey: string, generation: number): string =>
    JSON.stringify([requestKey, generation])
  const encodeArgs = Schema.encodeSync(Args)
  const decodeArgs = Schema.decodeSync(Args)
  const snapshotArgs = (args: Args): Args => decodeArgs(encodeArgs(args))
  const init = (): Readonly<{ model: Model }> => ({
    model: Model.make({ entries: HashMap.empty(), generation: 0, access: 0 }),
  })
  const requestReset = (model: Model): Readonly<{ model: Model }> => ({
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
  const applyTransition =
    (transition: AsyncDataTransition) =>
    (model: Model, args: Args): FetchReturn => {
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
    }
  const requestRevalidation = applyTransition(AsyncData.revalidate)
  const requestRevalidationOrLoad = applyTransition(AsyncData.revalidateOrLoad)
  const requestLoadIfMissing = applyTransition(AsyncData.loadIfMissing)
  const requestLoadIfStale = (
    model: Model,
    args: Args,
    nowMillis: number,
  ): FetchReturn => {
    if (isEntryFresh(model, args, nowMillis)) {
      return { model: touch(model, argsToKey(args)) }
    } else {
      return requestRevalidationOrLoad(model, args)
    }
  }
  const requestCancel = (model: Model, args: Args): CancelReturn => {
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
      commands: [CancelFetch({ requestKey, generation: entry.generation })],
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
    RequestedReset: requestReset,
    RequestedRevalidation: (
      model: Model,
      { args }: typeof Message.RequestedRevalidation.Type,
    ) => requestRevalidation(model, args),
    RequestedRevalidationOrLoad: (
      model: Model,
      { args }: typeof Message.RequestedRevalidationOrLoad.Type,
    ) => requestRevalidationOrLoad(model, args),
    RequestedLoadIfMissing: (
      model: Model,
      { args }: typeof Message.RequestedLoadIfMissing.Type,
    ) => requestLoadIfMissing(model, args),
    RequestedLoadIfStale: (
      model: Model,
      { args, nowMillis }: typeof Message.RequestedLoadIfStale.Type,
    ) => requestLoadIfStale(model, args, nowMillis),
    RequestedCancel: (
      model: Model,
      { args }: typeof Message.RequestedCancel.Type,
    ) => requestCancel(model, args),
    CompletedCancelFetch: (model: Model): Return => ({ model }),
    CompletedFetch: (
      model: Model,
      message: typeof Message.CompletedFetch.Type,
    ): Return =>
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
    ): Readonly<{ model: Model; outMessage?: typeof OutMessage.Type }> =>
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
    loadOnStart = [],
  }: KeyedQueryArgs<Fields>): Readonly<{ model: Model; start: Commands }> =>
    Array.reduce(
      loadOnStart,
      { model: init().model, start: [] },
      (started: Readonly<{ model: Model; start: Commands }>, args) => {
        const loaded = requestLoadIfMissing(started.model, args)
        return {
          model: loaded.model,
          start: [...started.start, ...(loaded.commands ?? [])],
        }
      },
    )
  const makeFetchHandlers = (execute: (args: Args) => Effect.Effect<A, E>) => {
    const registry = __makeRegistry()

    return {
      fetch: ({
        args,
        generation,
        requestKey,
      }: Readonly<{ args: Args; generation: number; requestKey: string }>) =>
        runWhileHoldingKey(
          registry,
          fetchKey(requestKey, generation),
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
        ),
      cancelFetch: ({
        requestKey,
        generation,
      }: Readonly<{ requestKey: string; generation: number }>) =>
        Effect.as(
          registry.interrupt(fetchKey(requestKey, generation)),
          Message.CompletedCancelFetch(),
        ),
    }
  }
  const run = (
    args: Args,
  ): Effect.Effect<AsyncData.AsyncData<A, E>, never, QueryFetcher<Name>> => {
    const requestArgs = snapshotArgs(args)

    return Effect.flatMap(Fetcher, execute =>
      pipe(
        execute(requestArgs),
        Effect.result,
        Effect.map(result => AsyncData.settle(AsyncData.Loading(), result)),
      ),
    )
  }

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
    isFresh: isEntryFresh,
    pendingArgs,
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

type KeyedQueryPolicy<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryPolicy<Name, A, AI, E, EI, Fields>>

type KeyedFetchBuild<
  A,
  E,
  Fields extends SyncFields,
  R,
  BuildE,
  BuildR,
> = Effect.Effect<
  (args: KeyedArgs<Fields>) => Effect.Effect<A, E, R>,
  BuildE,
  BuildR
>

type KeyedMessageType<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = KeyedQueryMessage<A, AI, E, EI, Fields>

/** Fetch Command definition owned by a KeyedQuery. */
export type KeyedQueryFetch<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = Command.LayeredCommandDefinitionWithArgs<
  `${Name}/Fetch`,
  {
    args: Schema.Struct<Fields>
    generation: typeof Schema.Number
    requestKey: typeof Schema.String
  },
  KeyedMessageType<A, AI, E, EI, Fields>['CompletedFetch']['Type']
>

/** CancelFetch Command definition owned by a KeyedQuery. */
export type KeyedQueryCancelFetch<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = Command.LayeredCommandDefinitionWithArgs<
  `${Name}/CancelFetch`,
  { requestKey: typeof Schema.String; generation: typeof Schema.Number },
  KeyedMessageType<A, AI, E, EI, Fields>['CompletedCancelFetch']['Type']
>

type PlainContract<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = Readonly<{
  Model: KeyedQueryModel<A, AI, E, EI, Fields>
  Message: KeyedQueryMessage<A, AI, E, EI, Fields>
  Command: readonly [
    KeyedQueryFetch<Name, A, AI, E, EI, Fields>,
    KeyedQueryCancelFetch<Name, A, AI, E, EI, Fields>,
  ]
}>

type NotifyingContract<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = PlainContract<Name, A, AI, E, EI, Fields> &
  Readonly<{ OutMessage: KeyedQueryOutMessage<A, AI, E, EI, Fields> }>

type KeyedQueryContract<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Notify extends boolean,
> = Notify extends true
  ? NotifyingContract<Name, A, AI, E, EI, Fields>
  : PlainContract<Name, A, AI, E, EI, Fields>

/**
 * A KeyedQuery instance: a viewless Block that fetches and retains
 * `AsyncData` entries keyed by argument values. Store it in the parent Model
 * and send it `Requested*` Messages. Notify selects whether it reports
 * accepted completions through the `CompletedFetch` OutMessage.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export interface KeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Notify extends boolean = false,
> extends BlockTypes.Instance<
  KeyedQuery<Name, A, AI, E, EI, Fields, Notify>,
  KeyedQueryContract<Name, A, AI, E, EI, Fields, Notify>,
  KeyedQueryArgs<Fields>
> {}

type KeyedModelType<A, AI, E, EI, Fields extends SyncFields> = KeyedQueryModel<
  A,
  AI,
  E,
  EI,
  Fields
>['Type']

/** The statics a KeyedQuery class carries beside its Block contract. */
export type KeyedQueryStatics<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Notify extends boolean,
> = Readonly<{
  /** Fetch Command definition owned by this KeyedQuery. Match and resolve it
   *  in Story and Scene tests. */
  Fetch: KeyedQueryFetch<Name, A, AI, E, EI, Fields>
  /** CancelFetch Command definition returned by `RequestedCancel`. */
  CancelFetch: KeyedQueryCancelFetch<Name, A, AI, E, EI, Fields>
  /** Reads AsyncData for one argument key from the KeyedQuery Model. A
   *  missing key returns Idle. */
  read: (
    model: KeyedModelType<A, AI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => AsyncData.AsyncData<A, E>
  /** Checks freshness without changing recency or reading the wall clock. */
  isFresh: (
    model: KeyedModelType<A, AI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
    nowMillis: number,
  ) => boolean
  /** Detached argument snapshots for currently pending entries. */
  pendingArgs: (
    model: KeyedModelType<A, AI, E, EI, Fields>,
  ) => ReadonlyArray<KeyedArgs<Fields>>
  /** Runs the fetch function directly for one set of arguments and returns
   *  settled AsyncData. Provide the KeyedQuery's Layer to supply the fetch
   *  function. */
  run: (
    args: KeyedArgs<Fields>,
  ) => Effect.Effect<AsyncData.AsyncData<A, E>, never, QueryFetcher<Name>>
  /** Builds the KeyedQuery's Layer from an Effect that constructs its fetch
   *  function. The fetch function is constructed once when the Layer is
   *  built and runs for every Fetch Command. */
  toLayer: <R, BuildE = never, BuildR = never>(
    build: KeyedFetchBuild<A, E, Fields, R, BuildE, BuildR>,
  ) => Layer.Layer<
    KeyedQuery<Name, A, AI, E, EI, Fields, Notify> | QueryFetcher<Name>,
    BuildE,
    Exclude<R | BuildR, Scope.Scope>
  >
}>

/**
 * A KeyedQuery class. Put it in a parent Model Schema, create instances with
 * `yield* new PostQuery('postDetails', {})`, and provide its Layer.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type KeyedQueryClass<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Notify extends boolean = false,
> = BlockTypes.BlockClass<
  KeyedQuery<Name, A, AI, E, EI, Fields, Notify>,
  Name,
  KeyedQueryArgs<Fields>,
  void,
  never,
  KeyedQueryContract<Name, A, AI, E, EI, Fields, Notify>
> &
  KeyedQueryStatics<Name, A, AI, E, EI, Fields, Notify>

/** A KeyedQuery class whose definition included a `handler`, with its Layer
 *  attached as `Live`. */
export type KeyedQueryWithLive<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Notify extends boolean,
  BuildE,
  R,
> = KeyedQueryClass<Name, A, AI, E, EI, Fields, Notify> &
  Readonly<{
    /** The KeyedQuery's Layer, built from its `handler`. */
    Live: Layer.Layer<
      KeyedQuery<Name, A, AI, E, EI, Fields, Notify> | QueryFetcher<Name>,
      BuildE,
      Exclude<R, Scope.Scope>
    >
  }>

const makeConstructor =
  <Name extends string, A, AI, E, EI, Fields extends SyncFields, Update>(
    policy: KeyedQueryPolicy<Name, A, AI, E, EI, Fields>,
    update: Update,
  ) =>
  (_id: string, args: KeyedQueryArgs<Fields>) =>
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

const makePlainKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  policy: KeyedQueryPolicy<Name, A, AI, E, EI, Fields>,
): KeyedQueryClass<Name, A, AI, E, EI, Fields, false> => {
  const contract: PlainContract<Name, A, AI, E, EI, Fields> = {
    Model: policy.Model,
    Message: policy.Message,
    Command: [policy.Fetch, policy.CancelFetch],
  }
  const QueryBlock = Block<
    KeyedQuery<Name, A, AI, E, EI, Fields, false>,
    KeyedQueryArgs<Fields>
  >()(policy.name, contract)
  const toLayer = <R, BuildE = never, BuildR = never>(
    build: KeyedFetchBuild<A, E, Fields, R, BuildE, BuildR>,
  ) =>
    QueryBlock.make(makeConstructor(policy, policy.updateHandlers)).pipe(
      Layer.provideMerge(makeFetcherLayer(policy.Fetcher, build)),
    )

  return Object.assign(QueryBlock, {
    Fetch: policy.Fetch,
    CancelFetch: policy.CancelFetch,
    read: policy.read,
    isFresh: policy.isFresh,
    pendingArgs: policy.pendingArgs,
    run: policy.run,
    toLayer,
  })
}

const makeNotifyingKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  policy: KeyedQueryPolicy<Name, A, AI, E, EI, Fields>,
): KeyedQueryClass<Name, A, AI, E, EI, Fields, true> => {
  const contract: NotifyingContract<Name, A, AI, E, EI, Fields> = {
    Model: policy.Model,
    Message: policy.Message,
    OutMessage: policy.OutMessage,
    Command: [policy.Fetch, policy.CancelFetch],
  }
  const QueryBlock = Block<
    KeyedQuery<Name, A, AI, E, EI, Fields, true>,
    KeyedQueryArgs<Fields>
  >()(policy.name, contract)
  const toLayer = <R, BuildE = never, BuildR = never>(
    build: KeyedFetchBuild<A, E, Fields, R, BuildE, BuildR>,
  ) =>
    QueryBlock.make(
      makeConstructor(policy, policy.notifyingUpdateHandlers),
    ).pipe(Layer.provideMerge(makeFetcherLayer(policy.Fetcher, build)))

  return Object.assign(QueryBlock, {
    Fetch: policy.Fetch,
    CancelFetch: policy.CancelFetch,
    read: policy.read,
    isFresh: policy.isFresh,
    pendingArgs: policy.pendingArgs,
    run: policy.run,
    toLayer,
  })
}

/** @internal Defines a KeyedQuery class, attaching `Live` when a fetch
 *  constructor is given. */
export const defineKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, boolean>,
  build?: KeyedFetchBuild<A, E, Fields, never, never, never>,
): unknown => {
  const policy = makeKeyedQueryPolicy(config)
  const query =
    config.notifyOnCompletion === true
      ? makeNotifyingKeyedQuery(policy)
      : makePlainKeyedQuery(policy)

  if (build === undefined) {
    return query
  } else {
    return Object.assign(query, { Live: query.toLayer(build) })
  }
}

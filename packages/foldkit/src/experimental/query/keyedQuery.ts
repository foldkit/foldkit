import {
  Array,
  Effect,
  Function,
  HashMap,
  Layer,
  Number,
  Option,
  Record,
  Schema,
  type Scope,
  Tuple,
  pipe,
} from 'effect'

import * as AsyncData from '../../asyncData/index.js'
import * as Block from '../../block/public.js'
import type { ValidateConstructionRequirements } from '../../block/scope.js'
import * as Command from '../../command/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import {
  type AsyncDataTransition,
  type CompletedFetchOf,
  type KeyedArgs,
  encodeKey,
} from './internal.js'

type AnyLayer =
  | Layer.Layer<never, unknown, unknown>
  | Layer.Layer<unknown, unknown, unknown>

/** Schema fields whose encoding and decoding require no services. */
export type SyncFields = {
  readonly [x: PropertyKey]: Schema.Codec<unknown, unknown, never, never>
}

/** Schemas, identity, and cache-key policy used to define a KeyedQuery. */
export type KeyedQueryConfig<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
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
  execute?: never
}>

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
> = Command.CommandDefinitionWithArgs<
  `${Name}/Fetch`,
  {
    readonly args: Schema.Struct<Fields>
    readonly generation: typeof Schema.Number
    readonly requestKey: typeof Schema.String
  },
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
    CompletedFetch: {
      args: Args,
      generation: Schema.Number,
      requestKey: Schema.String,
      result: Schema.Result(data, error),
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

/** Builds the Model Schema for a KeyedQuery. */
export const makeKeyedQueryModel = <A, AI, E, EI, Fields extends SyncFields>(
  data: Schema.Codec<A, AI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) => {
  const asyncData = AsyncData.Schema(data, error)

  return Schema.Struct({
    generation: Schema.Number,
    entries: Schema.HashMap(
      Schema.String,
      Schema.Struct({
        args: Args,
        data: asyncData.schema,
        generation: Schema.Number,
      }),
    ),
  })
}

/**
 * Model Schema for a KeyedQuery containing retained `AsyncData` entries.
 *
 * @experimental Ships from `foldkit/experimental/query`; expect breaking changes while the API settles.
 */
export type KeyedQueryModel<
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeKeyedQueryModel<A, AI, E, EI, Fields>>

const makeKeyedQueryApi = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  Fetch extends KeyedQueryFetchDefinition<Name, A, AI, E, EI, Fields>,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields>,
  Args: Schema.Struct<Fields>,
  Model: KeyedQueryModel<A, AI, E, EI, Fields>,
  Message: KeyedQueryMessage<A, AI, E, EI, Fields>,
  Fetch: Fetch,
) => {
  const asyncData = AsyncData.Schema(config.data, config.error)
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
  const encodeArgs = Schema.encodeSync(Args)
  const decodeArgs = Schema.decodeSync(Args)
  const snapshotArgs = (args: Args): Args => decodeArgs(encodeArgs(args))
  const init = () => ({
    model: Model.make({ entries: HashMap.empty(), generation: 0 }),
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
  const liftTransition = (
    transition: AsyncDataTransition,
  ): Update.Fold<
    Model,
    Message,
    Args,
    KeyedQueryFetchHandler<Name, A, AI, E, EI, Fields>
  > =>
    Function.dual(2, (model: Model, args: Args): UpdateReturn =>
      Option.match(transition(read(model, args)), {
        onNone: () => ({ model }),
        onSome: nextData => {
          const storedArgs = snapshotArgs(args)
          const requestArgs = snapshotArgs(storedArgs)
          const requestKey = argsToKey(storedArgs)
          const nextGeneration = Number.increment(model.generation)

          return {
            model: modifyFields(model, {
              entries: HashMap.set(requestKey, {
                args: storedArgs,
                data: nextData,
                generation: nextGeneration,
              }),
              generation: () => nextGeneration,
            }),
            commands: [
              Fetch({
                args: requestArgs,
                generation: nextGeneration,
                requestKey,
              }),
            ],
          }
        },
      }),
    )
  const revalidate = liftTransition(AsyncData.revalidate)
  const revalidateOrLoad = liftTransition(AsyncData.revalidateOrLoad)
  const loadIfMissing = liftTransition(AsyncData.loadIfMissing)
  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      RequestedReset: () => reset(model),
      RequestedRevalidation: ({ args }) => revalidate(model, args),
      RequestedRevalidationOrLoad: ({ args }) => revalidateOrLoad(model, args),
      RequestedLoadIfMissing: ({ args }) => loadIfMissing(model, args),
      CompletedFetch({ generation, requestKey, result }) {
        const maybeEntry = HashMap.get(model.entries, requestKey)

        if (Option.isNone(maybeEntry)) {
          return { model }
        }

        const entry = maybeEntry.value

        if (
          !AsyncData.isPending(entry.data) ||
          generation !== entry.generation
        ) {
          return { model }
        }

        return {
          model: modifyFields(model, {
            entries: HashMap.set(
              requestKey,
              modifyFields(entry, {
                data: () => AsyncData.settle(entry.data, result),
              }),
            ),
          }),
        }
      },
    })
  const operations = {
    requestRevalidation: (args: Args) =>
      Tuple.make(Message.RequestedRevalidation({ args })),
    requestRevalidationOrLoad: (args: Args) =>
      Tuple.make(Message.RequestedRevalidationOrLoad({ args })),
    requestLoadIfMissing: (args: Args) =>
      Tuple.make(Message.RequestedLoadIfMissing({ args })),
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
              Effect.map(result =>
                Message.CompletedFetch({
                  args,
                  generation,
                  requestKey,
                  result,
                }),
              ),
            ),
      ) as never,
    )

  return {
    init,
    reset,
    read,
    update,
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
> = Readonly<{
  init: () => Readonly<{
    model: KeyedQueryModelType<A, AI, E, EI, Fields>
  }>
  update: (
    model: KeyedQueryModelType<A, AI, E, EI, Fields>,
    message: KeyedQueryMessageType<A, AI, E, EI, Fields>,
  ) => Update.Return<
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
> = Block.Block<
  Block.Owner<Name, false>,
  KeyedQueryModel<A, AI, E, EI, Fields>,
  KeyedQueryMessage<A, AI, E, EI, Fields>,
  undefined,
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
    HostHandlers
  >
>

/**
 * Viewless Block for fetching and retaining `AsyncData` values by cache key.
 *
 * A KeyedQuery is one Block. Its cache entries are Model data, not keyed Block
 * instances. The final two parameters describe the Query's Effects Layer and
 * unresolved host handlers. Their defaults describe a host-provided Query.
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
> = Omit<
  KeyedQueryBlockBase<Name, A, AI, E, EI, Fields, EffectsLayer, HostHandlers>,
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
              HostHandlers
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
      HostHandlers
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
          readonly []
        >
      : never
  }>

const makeHostKeyedQuery = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields>,
): KeyedQuery<Name, A, AI, E, EI, Fields> => {
  const Args = Schema.Struct(config.args)
  const Model = makeKeyedQueryModel(config.data, config.error, Args)
  const Message = makeKeyedQueryMessage(config.data, config.error, Args)
  const QueryNamespace = Block.makeNamespace(config.name)
  const QueryDefinition = QueryNamespace.makeDefinition({
    Model,
    Message,
  })
  const Fetch = QueryDefinition.makeCommand('Fetch', {
    args: {
      args: Args,
      generation: Schema.Number,
      requestKey: Schema.String,
    },
    messages: [Message.CompletedFetch],
  })
  const api = makeKeyedQueryApi(config, Args, Model, Message, Fetch)
  const QueryComposition = QueryDefinition.makeComposition()
  const init = QueryComposition.makeInit(api.init)
  const prepare = () =>
    QueryComposition.prepareBlock({
      init,
      update: QueryComposition.makeUpdate(api.update),
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

  return enrichKeyedQuery(block, {
    Fetch,
    read: api.read,
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
    },
  })
}

const makeCanonicalKeyedQuery = <
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
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields>,
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
  BuildRequirements
> => {
  const Args = Schema.Struct(config.args)
  const Model = makeKeyedQueryModel(config.data, config.error, Args)
  const Message = makeKeyedQueryMessage(config.data, config.error, Args)
  const QueryNamespace = Block.makeNamespace(config.name)
  const QueryDefinition = QueryNamespace.makeDefinition({
    Model,
    Message,
  })
  const Fetch = QueryDefinition.makeCommand('Fetch', {
    args: {
      args: Args,
      generation: Schema.Number,
      requestKey: Schema.String,
    },
    messages: [Message.CompletedFetch],
  })
  const api = makeKeyedQueryApi(config, Args, Model, Message, Fetch)
  const QueryComposition = QueryDefinition.makeComposition()
  const init = QueryComposition.makeInit(api.init)
  const prepare = () =>
    QueryComposition.prepareBlock({
      init,
      update: QueryComposition.makeUpdate(api.update),
      operations: {
        ...api.operations,
        requestReset: Message.RequestedReset,
      },
      EffectsLayer: api.toLayer(handler),
    })
  const block: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)

  return enrichKeyedQuery(block, {
    Fetch,
    read: api.read,
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
    },
  })
}

/** A KeyedQuery whose fetch definition can be supplied through Block handler assembly. */
export type LayeredKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> = KeyedQuery<Name, A, AI, E, EI, Fields>

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
  readonly []
>

export function defineKeyedQuery<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields>,
): KeyedQuery<Name, A, AI, E, EI, Fields>
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
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields>,
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
  BuildRequirements
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
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields>,
  handler?: Effect.Effect<
    (args: KeyedArgs<Fields>) => Effect.Effect<A, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
) {
  if (handler === undefined) {
    return makeHostKeyedQuery(config)
  }

  return makeCanonicalKeyedQuery(config, handler)
}

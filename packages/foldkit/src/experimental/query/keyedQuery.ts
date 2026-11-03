import {
  Array,
  Effect,
  Function,
  HashMap,
  Layer,
  Number,
  Option,
  Order,
  Result,
  Schema,
  type Scope,
  pipe,
} from 'effect'

import * as AsyncData from '../../asyncData/public.js'
import * as Block from '../../block/public.js'
import type { ValidateConstructionRequirements } from '../../block/scope.js'
import * as Command from '../../command/index.js'
import { modifyFields } from '../../struct/index.js'
import * as Update from '../../update/index.js'
import { type AsyncDataTransition, type KeyedArgs } from './internal.js'
import {
  type KeyedQueryAccessors,
  type KeyedQueryConfig,
  type KeyedQueryFetchApi,
  type KeyedQueryFetchCommand,
  type KeyedQueryFetchDefinition,
  type KeyedQueryFetchHandler,
  type KeyedQueryMessage,
  type KeyedQueryModel,
  type KeyedQueryOutMessage,
  type KeyedQueryToLayer,
  type KeyedQueryTransitionMessages,
  type SyncFields,
  makeKeyedQueryAccessors,
  makeKeyedQueryFetchApi,
  makeKeyedQueryMessage,
  makeKeyedQueryModel,
  makeKeyedQueryOperations,
  makeKeyedQueryOutMessage,
} from './keyedQueryContract.js'
import { cancelData } from './policy.js'

type AnyLayer =
  | Layer.Layer<never, unknown, unknown>
  | Layer.Layer<unknown, unknown, unknown>

export type {
  SyncFields,
  KeyedQueryConfig,
  KeyedQueryToLayer,
  KeyedQueryMessage,
  KeyedQueryOutMessage,
  KeyedQueryModel,
  KeyedQueryOperationDeclarations,
} from './keyedQueryContract.js'
export {
  makeKeyedQueryMessage,
  makeKeyedQueryOutMessage,
  makeKeyedQueryModel,
  makeKeyedQueryOperations,
} from './keyedQueryContract.js'

type KeyedQueryMessageAt<Message, Tag extends string> = Extract<
  Message,
  Readonly<{ _tag: Tag }>
>

type KeyedQueryCommandMessage<Message> = Extract<
  Message,
  Readonly<{ _tag: 'CompletedFetch' | 'CompletedCancelFetch' }>
>

type KeyedQueryApiHandlers<Model, Message, Requirements> = Readonly<{
  RequestedReset: (
    model: Model,
  ) => Update.Return<Model, KeyedQueryCommandMessage<Message>>
  RequestedRevalidation: (
    model: Model,
    message: KeyedQueryMessageAt<Message, 'RequestedRevalidation'>,
  ) => Update.Return<Model, KeyedQueryCommandMessage<Message>, Requirements>
  RequestedRevalidationOrLoad: (
    model: Model,
    message: KeyedQueryMessageAt<Message, 'RequestedRevalidationOrLoad'>,
  ) => Update.Return<Model, KeyedQueryCommandMessage<Message>, Requirements>
  RequestedLoadIfMissing: (
    model: Model,
    message: KeyedQueryMessageAt<Message, 'RequestedLoadIfMissing'>,
  ) => Update.Return<Model, KeyedQueryCommandMessage<Message>, Requirements>
  RequestedLoadIfStale: (
    model: Model,
    message: KeyedQueryMessageAt<Message, 'RequestedLoadIfStale'>,
  ) => Update.Return<Model, KeyedQueryCommandMessage<Message>, Requirements>
  RequestedCancel: (
    model: Model,
    message: KeyedQueryMessageAt<Message, 'RequestedCancel'>,
  ) => Update.Return<Model, KeyedQueryCommandMessage<Message>>
  CompletedCancelFetch: (model: Model) => Readonly<{ model: Model }>
  CompletedFetch: (
    model: Model,
    message: KeyedQueryMessageAt<Message, 'CompletedFetch'>,
  ) => Update.Return<Model, KeyedQueryCommandMessage<Message>>
}>

/** @internal Named shared keyed transitions preserving their individual result channels. */
export interface KeyedQueryApi<
  Model,
  Message,
  OutMessageSchema extends Schema.Codec<any, any, any, any>,
  Args,
  A,
  E,
  Requirements,
>
  extends
    Pick<
      KeyedQueryAccessors<Model, Args, A, E>,
      'read' | 'isFresh' | 'pendingArgs'
    >,
    KeyedQueryFetchApi<Args, A, E, Requirements> {
  readonly init: () => Readonly<{ model: Model }>
  readonly reset: (
    model: Model,
  ) => Update.Return<Model, KeyedQueryCommandMessage<Message>>
  readonly OutMessage: OutMessageSchema
  readonly updateHandlers: KeyedQueryApiHandlers<Model, Message, Requirements>
  readonly notifyingUpdateHandlers: Omit<
    KeyedQueryApiHandlers<Model, Message, Requirements>,
    'CompletedFetch'
  > &
    Readonly<{
      CompletedFetch: (
        model: Model,
        message: KeyedQueryMessageAt<Message, 'CompletedFetch'>,
      ) => Update.ReturnWithOutMessage<
        Model,
        KeyedQueryCommandMessage<Message>,
        OutMessageSchema['Type']
      >
    }>
  readonly revalidate: Update.Fold<
    Model,
    KeyedQueryCommandMessage<Message>,
    Args,
    Requirements
  >
  readonly revalidateOrLoad: Update.Fold<
    Model,
    KeyedQueryCommandMessage<Message>,
    Args,
    Requirements
  >
  readonly loadIfMissing: Update.Fold<
    Model,
    KeyedQueryCommandMessage<Message>,
    Args,
    Requirements
  >
}

/** @internal Shares keyed transitions and fetch recipes without completing a Block. */
export const makeKeyedQueryApi = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
  FetchName extends string,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, boolean>,
  Args: Schema.Struct<Fields>,
  Model: KeyedQueryModel<A, AI, E, EI, Fields>,
  Message: KeyedQueryTransitionMessages<A, AI, E, EI, Fields>,
  Fetch: KeyedQueryFetchCommand<FetchName, A, AI, E, EI, Fields>,
  OutMessage: KeyedQueryOutMessage<
    A,
    AI,
    E,
    EI,
    Fields
  > = makeKeyedQueryOutMessage(config.data, config.error, Args),
): KeyedQueryApi<
  KeyedQueryModelType<A, AI, E, EI, Fields>,
  KeyedQueryMessageType<A, AI, E, EI, Fields>,
  KeyedQueryOutMessage<A, AI, E, EI, Fields>,
  KeyedArgs<Fields>,
  A,
  E,
  Command.HandlerOf<KeyedQueryFetchCommand<FetchName, A, AI, E, EI, Fields>>
> => {
  type Args = KeyedArgs<Fields>
  type Model = typeof Model.Type
  type Message = KeyedQueryMessageType<A, AI, E, EI, Fields>
  type UpdateReturn = Update.Return<
    Model,
    KeyedQueryCommandMessage<Message>,
    Command.HandlerOf<typeof Fetch>
  >
  type PureUpdateReturn = Update.Return<
    Model,
    KeyedQueryCommandMessage<Message>
  >

  const accessors = makeKeyedQueryAccessors(config, Args)
  const {
    read,
    isFresh: isEntryFresh,
    pendingArgs,
    argsToKey,
    snapshotArgs,
  } = accessors
  const { maxSettledEntries } = config
  const init = () => ({
    model: Model.make({ entries: HashMap.empty(), generation: 0, access: 0 }),
  })
  const reset = (model: Model): PureUpdateReturn => ({
    model: modifyFields(model, { entries: () => HashMap.empty() }),
  })
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
    KeyedQueryCommandMessage<Message>,
    Args,
    Command.HandlerOf<typeof Fetch>
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
    ): Update.ReturnWithOutMessage<
      Model,
      KeyedQueryCommandMessage<Message>,
      typeof OutMessage.Type
    > =>
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
  const { run, toLayer } = makeKeyedQueryFetchApi(Message, Fetch, accessors)

  return {
    init,
    reset,
    read,
    isFresh: isEntryFresh,
    pendingArgs,
    OutMessage,
    updateHandlers,
    notifyingUpdateHandlers,
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
  const OutMessage = makeKeyedQueryOutMessage(config.data, config.error, Args)
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
  const api = makeKeyedQueryApi(config, Args, Model, Message, Fetch, OutMessage)
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
        operations: makeKeyedQueryOperations(Message),
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
        operations: makeKeyedQueryOperations(Message),
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

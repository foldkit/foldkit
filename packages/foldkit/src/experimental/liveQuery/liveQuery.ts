import {
  Array,
  Effect,
  HashMap,
  Layer,
  Number,
  Option,
  Order,
  Result,
  Schema,
  type Scope,
  Stream,
  Tuple,
  pipe,
} from 'effect'

import * as AsyncData from '../../asyncData/index.js'
import * as Block from '../../block/public.js'
import type { ValidateConstructionRequirements } from '../../block/scope.js'
import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Subscription from '../../subscription/public.js'
import type * as Update from '../../update/index.js'
import { type KeyedArgs, encodeKey } from '../query/internal.js'
import type { SyncFields } from '../query/keyedQuery.js'

type AnyLayer =
  | Layer.Layer<never, unknown, unknown>
  | Layer.Layer<unknown, unknown, unknown>

/** Schemas, identity, and feed-key policy used to define a LiveQuery. */
export type LiveQueryConfig<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = Readonly<{
  /** Block identity and prefix for the LiveQuery's Feeds Subscription. */
  name: Name
  /** Schema for the retained state carried by each feed entry. */
  state: Schema.Codec<S, SI, never, never>
  /** Schema for expected feed failures retained in AsyncData. */
  error: Schema.Codec<E, EI, never, never>
  /** Schema for the metadata each feed entry reports to the parent through
   * `AppliedEntry`. Omit it when entries carry no metadata. */
  meta?: Schema.Codec<M, MI, never, never>
  /** Schema fields for the arguments that select one feed. */
  args: Fields
  /** Derives a stable feed key from decoded arguments. By default Foldkit
   * canonically JSON-encodes the declared argument Schema. */
  toKey?: (args: KeyedArgs<Fields>) => string
}>

type ResolvedLiveQueryConfig<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = Omit<LiveQueryConfig<Name, S, SI, E, EI, M, MI, Fields>, 'meta'> &
  Readonly<{ meta: Schema.Codec<M, MI, never, never> }>

/**
 * One entry of a live feed: the authoritative state after the entry, its
 * sequence number, and the metadata reported to the parent.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export type LiveQueryEntry<S, M> = Readonly<{ seq: number; state: S }> &
  ([M] extends [undefined]
    ? Readonly<{ meta?: undefined }>
    : Readonly<{ meta: M }>)

type OpenFeed<S, E, M, R, Args> = (
  args: Args,
  maybeAfter: Option.Option<number>,
) => Stream.Stream<LiveQueryEntry<S, M>, E, R>

/**
 * Schema-backed tagged union for the connection state of one feed.
 *
 * - `Connecting`: the feed Stream started or restarted and has delivered no
 *   entry in this session yet.
 * - `Live`: the feed Stream delivered at least one entry in this session.
 * - `Offline`: the feed is paused or its Stream ended.
 * - `Failed`: the feed Stream failed. Its error is retained in `data`.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export const Connection = defineTaggedUnion({
  Connecting: {},
  Live: {},
  Offline: {},
  Failed: {},
})

/**
 * The connection state of one feed.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export type Connection = typeof Connection.Type

const isStreaming = Connection.isAnyOf(['Connecting', 'Live'])
const isLive = Connection.isAnyOf(['Live'])

const makeSnapshot = <S, SI>(state: Schema.Codec<S, SI>) =>
  Schema.Struct({ state, cursor: Schema.Number })

const makeLiveQueryMessage = <S, SI, E, EI, M, MI, Fields extends SyncFields>(
  state: Schema.Codec<S, SI>,
  error: Schema.Codec<E, EI>,
  meta: Schema.Codec<M, MI>,
  Args: Schema.Struct<Fields>,
) =>
  defineMessageUnion({
    RequestedWatch: {
      args: Args,
      maybeSnapshot: Schema.Option(makeSnapshot(state)),
    },
    RequestedUnwatch: { args: Args },
    RequestedPause: {},
    RequestedResume: {},
    ReceivedEntry: {
      feedKey: Schema.String,
      generation: Schema.Number,
      seq: Schema.Number,
      state,
      meta,
    },
    EndedFeed: { feedKey: Schema.String, generation: Schema.Number },
    FailedFeed: {
      feedKey: Schema.String,
      generation: Schema.Number,
      error,
    },
  })

/**
 * Schema-backed Message union for requested LiveQuery operations and feed
 * Stream events.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export type LiveQueryMessage<
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = ReturnType<typeof makeLiveQueryMessage<S, SI, E, EI, M, MI, Fields>>

/**
 * Constructors for the Messages one feed's current Stream session delivers.
 * Tests use them to feed entries, failures, and Stream ends through update
 * without running the handler.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export type LiveQuerySessionMessages<
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = Readonly<{
  /** Builds the Message for one entry delivered by the feed Stream. */
  receivedEntry: (
    entry: LiveQueryEntry<S, M>,
  ) => LiveQueryMessage<S, SI, E, EI, M, MI, Fields>['Type']
  /** Builds the Message for a feed Stream that ended without failing. */
  endedFeed: () => LiveQueryMessage<S, SI, E, EI, M, MI, Fields>['Type']
  /** Builds the Message for a feed Stream that failed. */
  failedFeed: (
    error: E,
  ) => LiveQueryMessage<S, SI, E, EI, M, MI, Fields>['Type']
}>

const makeLiveQueryOutMessage = <M, MI, Fields extends SyncFields>(
  meta: Schema.Codec<M, MI>,
  Args: Schema.Struct<Fields>,
) =>
  defineMessageUnion({
    AppliedEntry: {
      args: Args,
      seq: Schema.Number,
      maybePreviousCursor: Schema.Option(Schema.Number),
      meta,
    },
  })

/**
 * Schema-backed OutMessage union a LiveQuery reports for each applied entry.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export type LiveQueryOutMessage<M, MI, Fields extends SyncFields> = ReturnType<
  typeof makeLiveQueryOutMessage<M, MI, Fields>
>

const makeLiveQueryModel = <S, SI, E, EI, Fields extends SyncFields>(
  state: Schema.Codec<S, SI>,
  error: Schema.Codec<E, EI>,
  Args: Schema.Struct<Fields>,
) =>
  Schema.Struct({
    generation: Schema.Number,
    isPaused: Schema.Boolean,
    feeds: Schema.HashMap(
      Schema.String,
      Schema.Struct({
        args: Args,
        data: AsyncData.Schema(state, error).schema,
        maybeCursor: Schema.Option(Schema.Number),
        maybeResumeAfter: Schema.Option(Schema.Number),
        connection: Connection,
        generation: Schema.Number,
      }),
    ),
  })

/**
 * Model Schema for a LiveQuery containing one retained feed per key.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export type LiveQueryModel<
  S,
  SI,
  E,
  EI,
  Fields extends SyncFields,
> = ReturnType<typeof makeLiveQueryModel<S, SI, E, EI, Fields>>

const makeFeedDependency = <Fields extends SyncFields>(
  Args: Schema.Struct<Fields>,
) =>
  Schema.Struct({
    feedKey: Schema.String,
    args: Args,
    maybeAfter: Schema.Option(Schema.Number),
    generation: Schema.Number,
  })

type FeedDependency<Fields extends SyncFields> = ReturnType<
  typeof makeFeedDependency<Fields>
>['Type']

const feedDependencyOrder = Order.mapInput(
  Order.String,
  ({ feedKey }: Readonly<{ feedKey: string }>) => feedKey,
)

const makeLiveQueryParts = <
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
>(
  config: ResolvedLiveQueryConfig<Name, S, SI, E, EI, M, MI, Fields>,
) => {
  const Args = Schema.Struct(config.args)
  const Model = makeLiveQueryModel(config.state, config.error, Args)
  const Message = makeLiveQueryMessage(
    config.state,
    config.error,
    config.meta,
    Args,
  )
  const OutMessage = makeLiveQueryOutMessage(config.meta, Args)
  const FeedDependency = makeFeedDependency(Args)
  const asyncData = AsyncData.Schema(config.state, config.error)

  type Args = KeyedArgs<Fields>
  type Model = typeof Model.Type
  type Feed =
    Model['feeds'] extends HashMap.HashMap<string, infer Value> ? Value : never
  type Message = typeof Message.Type
  type OutMessage = typeof OutMessage.Type
  type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

  const argsToKey = config.toKey ?? encodeKey(Args)
  const encodeArgs = Schema.encodeSync(Args)
  const decodeArgs = Schema.decodeSync(Args)
  const snapshotArgs = (args: Args): Args => decodeArgs(encodeArgs(args))

  const LiveQueryNamespace = Block.makeNamespace(config.name)
  const LiveQueryDefinition = LiveQueryNamespace.makeDefinition({
    Model,
    Message,
    OutMessage,
  })

  const modelToFeedDependencies = (
    model: Model,
  ): ReadonlyArray<FeedDependency<Fields>> => {
    if (model.isPaused) {
      return []
    } else {
      return pipe(
        model.feeds,
        HashMap.toEntries,
        Array.filter(([, feed]) => isStreaming(feed.connection)),
        Array.map(([feedKey, feed]) => ({
          feedKey,
          args: feed.args,
          maybeAfter: feed.maybeResumeAfter,
          generation: feed.generation,
        })),
        Array.sort(feedDependencyOrder),
      )
    }
  }

  const subscriptions = LiveQueryDefinition.makeSubscriptions(entry => ({
    feeds: entry(
      'Feeds',
      { feeds: Schema.Array(FeedDependency) },
      {
        messages: [
          Message.ReceivedEntry,
          Message.EndedFeed,
          Message.FailedFeed,
        ],
        modelToDependencies: model => ({
          feeds: modelToFeedDependencies(model),
        }),
      },
    ),
  }))
  const Feeds: LiveQueryFeeds<Name, S, SI, E, EI, M, MI, Fields> =
    subscriptions.feeds

  const makeSessionMessages = (
    feedKey: string,
    generation: number,
  ): LiveQuerySessionMessages<S, SI, E, EI, M, MI, Fields> => ({
    receivedEntry: entry =>
      Message.ReceivedEntry({
        feedKey,
        generation,
        seq: entry.seq,
        state: entry.state,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        meta: entry.meta as M,
      }),
    endedFeed: () => Message.EndedFeed({ feedKey, generation }),
    failedFeed: error => Message.FailedFeed({ feedKey, generation, error }),
  })

  const toFeedsStream =
    <R>(open: OpenFeed<S, E, M, R, Args>) =>
    ({ feeds }: Readonly<{ feeds: ReadonlyArray<FeedDependency<Fields>> }>) =>
      Stream.mergeAll(
        Array.map(feeds, ({ feedKey, args, maybeAfter, generation }) => {
          const sessionMessages = makeSessionMessages(feedKey, generation)

          return pipe(
            open(args, maybeAfter),
            Stream.map(sessionMessages.receivedEntry),
            Stream.concat(Stream.sync(sessionMessages.endedFeed)),
            Stream.catch(error =>
              Stream.make(sessionMessages.failedFeed(error)),
            ),
          )
        }),
        { concurrency: 'unbounded' },
      )

  const toLayer: LiveQueryToLayer<Name, S, SI, E, EI, M, MI, Fields> = <
    HandlerR,
    BuildE = never,
    BuildR = never,
  >(
    build: Effect.Effect<
      (
        args: Args,
        maybeAfter: Option.Option<number>,
      ) => Stream.Stream<LiveQueryEntry<S, M>, E, HandlerR>,
      BuildE,
      BuildR
    > &
      ValidateConstructionRequirements<BuildR>,
  ) =>
    Feeds.toLayer<HandlerR, BuildE, BuildR>(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Effect.map(build, open => toFeedsStream<HandlerR>(open)) as never,
    )

  const toStreamingData = (
    data: AsyncData.AsyncData<S, E>,
  ): AsyncData.AsyncData<S, E> =>
    AsyncData.isIdle(data) || AsyncData.isFailure(data)
      ? asyncData.Loading()
      : data

  const toStoppedData = (
    data: AsyncData.AsyncData<S, E>,
  ): AsyncData.AsyncData<S, E> =>
    AsyncData.isLoading(data) ? asyncData.Idle() : data

  const restartFeeds =
    (shouldRestart: (feed: Feed) => boolean) =>
    (model: Model): Model => {
      if (model.isPaused) {
        return model
      } else {
        const nextGeneration = Number.increment(model.generation)

        return modifyFields(model, {
          generation: () => nextGeneration,
          feeds: HashMap.map(feed => {
            if (shouldRestart(feed)) {
              return modifyFields(feed, {
                data: toStreamingData,
                maybeResumeAfter: () => feed.maybeCursor,
                connection: () => Connection.Connecting(),
                generation: () => nextGeneration,
              })
            } else {
              return feed
            }
          }),
        })
      }
    }

  const restartStreamingFeeds = restartFeeds(feed =>
    isStreaming(feed.connection),
  )
  const restartEveryFeed = restartFeeds(() => true)

  const newFeed = (
    args: Args,
    maybeSnapshot: Option.Option<Readonly<{ state: S; cursor: number }>>,
    isPaused: boolean,
  ): Feed => {
    const maybeCursor = Option.map(maybeSnapshot, ({ cursor }) => cursor)
    const snapshotData = Option.match(maybeSnapshot, {
      onNone: () => asyncData.Idle(),
      onSome: ({ state }) => asyncData.Success({ data: state }),
    })

    return {
      args,
      data: isPaused ? snapshotData : toStreamingData(snapshotData),
      maybeCursor,
      maybeResumeAfter: maybeCursor,
      connection: isPaused ? Connection.Offline() : Connection.Connecting(),
      generation: 0,
    }
  }

  const currentFeed = (
    model: Model,
    feedKey: string,
    generation: number,
  ): Option.Option<Feed> =>
    Option.filter(
      HashMap.get(model.feeds, feedKey),
      feed => feed.generation === generation && isStreaming(feed.connection),
    )

  const stopFeed = (
    model: Model,
    feedKey: string,
    generation: number,
    transform: (feed: Feed) => Feed,
  ): Model =>
    Option.match(currentFeed(model, feedKey, generation), {
      onNone: () => model,
      onSome: feed =>
        restartStreamingFeeds(
          modifyFields(model, {
            feeds: HashMap.set(feedKey, transform(feed)),
          }),
        ),
    })

  const requestWatch = ({
    args,
    maybeSnapshot,
  }: Readonly<{
    args: Args
    maybeSnapshot?: Option.Option<Readonly<{ state: S; cursor: number }>>
  }>) =>
    Tuple.make(
      Message.RequestedWatch({
        args,
        maybeSnapshot: maybeSnapshot ?? Option.none(),
      }),
    )

  const init = () => ({
    model: Model.make({
      generation: 0,
      isPaused: false,
      feeds: HashMap.empty(),
    }),
  })

  const read = (model: Model, args: Args): AsyncData.AsyncData<S, E> =>
    AsyncData.fromOptionOrIdle(
      Option.map(HashMap.get(model.feeds, argsToKey(args)), ({ data }) => data),
    )

  const readCursor = (model: Model, args: Args): Option.Option<number> =>
    Option.flatMap(
      HashMap.get(model.feeds, argsToKey(args)),
      ({ maybeCursor }) => maybeCursor,
    )

  const sessionMessages = (
    model: Model,
    args: Args,
  ): Option.Option<LiveQuerySessionMessages<S, SI, E, EI, M, MI, Fields>> => {
    const feedKey = argsToKey(args)

    return Option.map(HashMap.get(model.feeds, feedKey), ({ generation }) =>
      makeSessionMessages(feedKey, generation),
    )
  }

  const readConnection = (
    model: Model,
    args: Args,
  ): Option.Option<Connection> =>
    Option.map(
      HashMap.get(model.feeds, argsToKey(args)),
      ({ connection }) => connection,
    )

  const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
      RequestedWatch: ({ args, maybeSnapshot }) => {
        const storedArgs = snapshotArgs(args)
        const feedKey = argsToKey(storedArgs)

        if (HashMap.has(model.feeds, feedKey)) {
          return { model }
        }

        const nextFeed = newFeed(storedArgs, maybeSnapshot, model.isPaused)

        return {
          model: restartStreamingFeeds(
            modifyFields(model, {
              feeds: HashMap.set(feedKey, nextFeed),
            }),
          ),
        }
      },
      RequestedUnwatch: ({ args }) => {
        const feedKey = argsToKey(args)

        if (!HashMap.has(model.feeds, feedKey)) {
          return { model }
        }

        return {
          model: restartStreamingFeeds(
            modifyFields(model, { feeds: HashMap.remove(feedKey) }),
          ),
        }
      },
      RequestedPause: () => ({
        model: modifyFields(model, {
          isPaused: () => true,
          feeds: HashMap.map(feed =>
            isStreaming(feed.connection)
              ? modifyFields(feed, {
                  connection: () => Connection.Offline(),
                  data: toStoppedData,
                })
              : feed,
          ),
        }),
      }),
      RequestedResume: () => ({
        model: restartEveryFeed(modifyFields(model, { isPaused: () => false })),
      }),
      ReceivedEntry: ({ feedKey, generation, seq, state, meta }) =>
        Option.match(currentFeed(model, feedKey, generation), {
          onNone: () => ({ model }),
          onSome: feed => {
            const isDuplicate = Option.exists(
              feed.maybeCursor,
              cursor => seq <= cursor,
            )

            if (isDuplicate && isLive(feed.connection)) {
              return { model }
            } else if (isDuplicate) {
              const nextFeed: Feed = modifyFields(feed, {
                data: data =>
                  AsyncData.isStale(data)
                    ? asyncData.Success({ data: data.data })
                    : data,
                connection: () => Connection.Live(),
              })

              return {
                model: modifyFields(model, {
                  feeds: HashMap.set(feedKey, nextFeed),
                }),
              }
            } else {
              const nextFeed: Feed = modifyFields(feed, {
                data: () => asyncData.Success({ data: state }),
                maybeCursor: () => Option.some(seq),
                connection: () => Connection.Live(),
              })

              return {
                model: modifyFields(model, {
                  feeds: HashMap.set(feedKey, nextFeed),
                }),
                outMessage: OutMessage.AppliedEntry({
                  args: feed.args,
                  seq,
                  maybePreviousCursor: feed.maybeCursor,
                  meta,
                }),
              }
            }
          },
        }),
      EndedFeed: ({ feedKey, generation }) => ({
        model: stopFeed(model, feedKey, generation, feed =>
          modifyFields(feed, {
            connection: () => Connection.Offline(),
            data: toStoppedData,
          }),
        ),
      }),
      FailedFeed: ({ feedKey, generation, error }) => ({
        model: stopFeed(model, feedKey, generation, feed =>
          modifyFields(feed, {
            connection: () => Connection.Failed(),
            data: data => AsyncData.settle(data, Result.fail(error)),
          }),
        ),
      }),
    })

  return {
    Model,
    Message,
    OutMessage,
    LiveQueryDefinition,
    subscriptions,
    Feeds,
    init,
    read,
    readCursor,
    readConnection,
    sessionMessages,
    requestWatch,
    update,
    toLayer,
  }
}

type LiveQueryParts<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = ReturnType<typeof makeLiveQueryParts<Name, S, SI, E, EI, M, MI, Fields>>

type FeedMessageTag = 'ReceivedEntry' | 'EndedFeed' | 'FailedFeed'

type LiveQueryFeedMessage<
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = Extract<
  LiveQueryMessage<S, SI, E, EI, M, MI, Fields>['Type'],
  Readonly<{ _tag: FeedMessageTag }>
>

type LiveQueryFeedDependencies<Fields extends SyncFields> = Readonly<{
  feeds: ReadonlyArray<FeedDependency<Fields>>
}>

type LiveQueryFeeds<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = Subscription.LayeredEntryWithoutKeepAlive<
  `${Name}/Feeds`,
  LiveQueryModel<S, SI, E, EI, Fields>['Type'],
  LiveQueryFeedMessage<S, SI, E, EI, M, MI, Fields>,
  LiveQueryFeedDependencies<Fields>,
  readonly [
    LiveQueryMessage<S, SI, E, EI, M, MI, Fields>['ReceivedEntry'],
    LiveQueryMessage<S, SI, E, EI, M, MI, Fields>['EndedFeed'],
    LiveQueryMessage<S, SI, E, EI, M, MI, Fields>['FailedFeed'],
  ]
> &
  Subscription.Subscription<
    LiveQueryModel<S, SI, E, EI, Fields>['Type'],
    LiveQueryFeedMessage<S, SI, E, EI, M, MI, Fields>,
    LiveQueryFeedDependencies<Fields>,
    Subscription.Handler<
      `${Name}/Feeds`,
      LiveQueryFeedDependencies<Fields>,
      LiveQueryFeedMessage<S, SI, E, EI, M, MI, Fields>
    >
  >

type LiveQueryFeedsHandler<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = Subscription.HandlerOf<LiveQueryFeeds<Name, S, SI, E, EI, M, MI, Fields>>

/** Builds a LiveQuery feed handler Layer from an Effect that constructs the
 * function opening one feed. */
export interface LiveQueryToLayer<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> {
  <R, BuildE = never, BuildR = never>(
    build: Effect.Effect<
      (
        args: KeyedArgs<Fields>,
        maybeAfter: Option.Option<number>,
      ) => Stream.Stream<LiveQueryEntry<S, M>, E, R>,
      BuildE,
      BuildR
    > &
      ValidateConstructionRequirements<BuildR>,
  ): Layer.Layer<
    LiveQueryFeedsHandler<Name, S, SI, E, EI, M, MI, Fields>,
    BuildE,
    Exclude<R | BuildR, Scope.Scope>
  >
}

// oxlint-disable effecttsgo/any-unknown-in-error-context
const enrichLiveQuery = <
  BlockValue extends Block.AnyBlock,
  Api extends Readonly<Record<string, unknown>>,
  Operations extends Readonly<
    Record<string, (...args: ReadonlyArray<any>) => any>
  >,
>(
  block: BlockValue,
  api: Api,
  operations: Operations,
) => {
  const { replaceEffectsLayer, provideHandlers } = block

  return Object.assign(block, {
    ...api,
    ...operations,
    replaceEffectsLayer: <EffectsLayer extends AnyLayer>(
      EffectsLayer: EffectsLayer,
    ) => enrichLiveQuery(replaceEffectsLayer(EffectsLayer), api, operations),
    provideHandlers: <HandlersLayer extends AnyLayer>(
      HandlersLayer: HandlersLayer,
    ) => enrichLiveQuery(provideHandlers(HandlersLayer), api, operations),
  })
}
// oxlint-enable effecttsgo/any-unknown-in-error-context

type LiveQueryModelType<
  S,
  SI,
  E,
  EI,
  Fields extends SyncFields,
> = LiveQueryModel<S, SI, E, EI, Fields>['Type']

type LiveQueryMessageType<
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = LiveQueryMessage<S, SI, E, EI, M, MI, Fields>['Type']

type LiveQueryOutMessageType<
  M,
  MI,
  Fields extends SyncFields,
> = LiveQueryOutMessage<M, MI, Fields>['Type']

type LiveQueryUpdateReturn<
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = Update.ReturnWithOutMessage<
  LiveQueryModelType<S, SI, E, EI, Fields>,
  LiveQueryMessageType<S, SI, E, EI, M, MI, Fields>,
  LiveQueryOutMessageType<M, MI, Fields>
>

/**
 * A known state of one feed and the cursor it is valid at, used to hydrate a
 * watch without a loading state.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export type LiveQuerySnapshot<S> = Readonly<{ state: S; cursor: number }>

type LiveQueryExposedOperations<
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = Readonly<{
  /** Starts watching the feed selected by `args`. With a snapshot, the feed's
   * data starts as `Success` and its Stream resumes after the snapshot cursor.
   * Without one, the data is `Loading` until the first entry arrives, or
   * `Idle` while the LiveQuery is paused. A feed that is already watched
   * remains unchanged. */
  requestWatch: (
    model: LiveQueryModelType<S, SI, E, EI, Fields>,
    payload: Readonly<{
      args: KeyedArgs<Fields>
      maybeSnapshot?: Option.Option<LiveQuerySnapshot<S>>
    }>,
  ) => LiveQueryUpdateReturn<S, SI, E, EI, M, MI, Fields>
  /** Stops watching the feed selected by `args` and removes its retained
   * state. */
  requestUnwatch: (
    model: LiveQueryModelType<S, SI, E, EI, Fields>,
    payload: Readonly<{ args: KeyedArgs<Fields> }>,
  ) => LiveQueryUpdateReturn<S, SI, E, EI, M, MI, Fields>
  /** Stops every feed Stream and marks each streaming feed `Offline`.
   * Retained data and cursors are kept. A feed that has no data yet returns
   * to `Idle`. */
  requestPause: (
    model: LiveQueryModelType<S, SI, E, EI, Fields>,
  ) => LiveQueryUpdateReturn<S, SI, E, EI, M, MI, Fields>
  /** Restarts every watched feed after its current cursor, including feeds
   * that are `Offline` or `Failed`. */
  requestResume: (
    model: LiveQueryModelType<S, SI, E, EI, Fields>,
  ) => LiveQueryUpdateReturn<S, SI, E, EI, M, MI, Fields>
}>

type LiveQueryImplementation<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
> = Readonly<{
  init: () => Readonly<{ model: LiveQueryModelType<S, SI, E, EI, Fields> }>
  update: (
    model: LiveQueryModelType<S, SI, E, EI, Fields>,
    message: LiveQueryMessageType<S, SI, E, EI, M, MI, Fields>,
  ) => LiveQueryUpdateReturn<S, SI, E, EI, M, MI, Fields>
  operations: LiveQueryExposedOperations<S, SI, E, EI, M, MI, Fields>
  subscriptions: Readonly<{
    feeds: LiveQueryFeeds<Name, S, SI, E, EI, M, MI, Fields>
  }>
  EffectsLayer: EffectsLayer
  hostHandlers: HostHandlers
}>

type LiveQueryConveniences<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
> = Readonly<{
  /** Feeds Subscription entry owned by this LiveQuery Block. */
  Feeds: LiveQueryFeeds<Name, S, SI, E, EI, M, MI, Fields>
  /** Reads the retained AsyncData of one feed without exposing the LiveQuery
   * Model shape. A feed that is not watched returns Idle. */
  read: (
    model: LiveQueryModelType<S, SI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => AsyncData.AsyncData<S, E>
  /** Reads the sequence number of the last entry applied to one feed. Returns
   * None when the feed is not watched or has applied nothing yet. */
  readCursor: (
    model: LiveQueryModelType<S, SI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => Option.Option<number>
  /** Reads the connection state of one feed. Returns None when the feed is not
   * watched. */
  readConnection: (
    model: LiveQueryModelType<S, SI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => Option.Option<Connection>
  /** Returns constructors for the Messages that the current Stream session
   * of one feed delivers, or None when the feed is not watched. Messages from
   * an earlier session are ignored, so build them from the Model they are
   * delivered to. */
  sessionMessages: (
    model: LiveQueryModelType<S, SI, E, EI, Fields>,
    args: KeyedArgs<Fields>,
  ) => Option.Option<LiveQuerySessionMessages<S, SI, E, EI, M, MI, Fields>>
  /** Builds a handler Layer from an Effect that constructs the function
   * opening one feed. */
  toLayer: LiveQueryToLayer<Name, S, SI, E, EI, M, MI, Fields>
}> &
  LiveQueryExposedOperations<S, SI, E, EI, M, MI, Fields>

type MergeLayers<Left extends AnyLayer, Right extends AnyLayer> = Layer.Layer<
  Layer.Success<Left | Right>,
  Layer.Error<Left | Right>,
  Layer.Services<Left | Right>
>

type LiveQueryBlockBase<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
  EffectsLayer extends AnyLayer,
  HostHandlers extends ReadonlyArray<unknown>,
> = Block.Block<
  Block.Owner<Name, false>,
  LiveQueryModel<S, SI, E, EI, Fields>,
  LiveQueryMessage<S, SI, E, EI, M, MI, Fields>,
  LiveQueryOutMessage<M, MI, Fields>,
  readonly [],
  readonly [],
  LiveQueryImplementation<
    Name,
    S,
    SI,
    E,
    EI,
    M,
    MI,
    Fields,
    EffectsLayer,
    HostHandlers
  >
>

/**
 * Viewless Block that retains the latest state of keyed live feeds.
 *
 * One Subscription streams every watched feed. Each feed keeps its
 * `AsyncData`, the cursor of the last applied entry, and its connection
 * state. The final two parameters describe the LiveQuery's Effects Layer and
 * unresolved host handlers. Their defaults describe a host-provided
 * LiveQuery.
 *
 * @experimental Ships from `foldkit/experimental/liveQuery`; expect breaking changes while the API settles.
 */
export type LiveQuery<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
  EffectsLayer extends AnyLayer = Layer.Layer<never, never, never>,
  HostHandlers extends ReadonlyArray<unknown> = readonly [
    LiveQueryFeeds<Name, S, SI, E, EI, M, MI, Fields>,
  ],
> = Omit<
  LiveQueryBlockBase<
    Name,
    S,
    SI,
    E,
    EI,
    M,
    MI,
    Fields,
    EffectsLayer,
    HostHandlers
  >,
  'replaceEffectsLayer' | 'provideHandlers'
> &
  LiveQueryConveniences<Name, S, SI, E, EI, M, MI, Fields> &
  Readonly<{
    /** Replaces the LiveQuery's complete local feed handler recipe. */
    replaceEffectsLayer: <SelectedEffectsLayer extends AnyLayer>(
      EffectsLayer: SelectedEffectsLayer &
        NoInfer<
          Block.ValidateConcreteComposition<
            LiveQueryBlockBase<
              Name,
              S,
              SI,
              E,
              EI,
              M,
              MI,
              Fields,
              SelectedEffectsLayer,
              HostHandlers
            >
          >
        >,
    ) => LiveQuery<
      Name,
      S,
      SI,
      E,
      EI,
      M,
      MI,
      Fields,
      SelectedEffectsLayer,
      HostHandlers
    >
    /** Supplies the host-provided Feeds handler and returns a complete
     * LiveQuery. */
    provideHandlers: HostHandlers extends readonly [
      LiveQueryFeeds<Name, S, SI, E, EI, M, MI, Fields>,
    ]
      ? <HandlerError, HandlerRequirements>(
          HandlersLayer: Layer.Layer<
            LiveQueryFeedsHandler<Name, S, SI, E, EI, M, MI, Fields>,
            HandlerError,
            HandlerRequirements
          >,
        ) => LiveQuery<
          Name,
          S,
          SI,
          E,
          EI,
          M,
          MI,
          Fields,
          MergeLayers<
            EffectsLayer,
            Layer.Layer<
              LiveQueryFeedsHandler<Name, S, SI, E, EI, M, MI, Fields>,
              HandlerError,
              HandlerRequirements
            >
          >,
          readonly []
        >
      : never
  }>

/** @internal Exact completed Block type for a LiveQuery with a canonical
 * handler. */
export type CanonicalLiveQuery<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
> = LiveQuery<
  Name,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields,
  Layer.Layer<
    LiveQueryFeedsHandler<Name, S, SI, E, EI, M, MI, Fields>,
    BuildError,
    Exclude<HandlerRequirements | BuildRequirements, Scope.Scope>
  >,
  readonly []
>

const toLiveQueryApi = <
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
>(
  parts: LiveQueryParts<Name, S, SI, E, EI, M, MI, Fields>,
) => ({
  Feeds: parts.Feeds,
  read: parts.read,
  readCursor: parts.readCursor,
  readConnection: parts.readConnection,
  sessionMessages: parts.sessionMessages,
  toLayer: parts.toLayer,
})

const makeHostLiveQuery = <
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
>(
  config: ResolvedLiveQueryConfig<Name, S, SI, E, EI, M, MI, Fields>,
): LiveQuery<Name, S, SI, E, EI, M, MI, Fields> => {
  const parts = makeLiveQueryParts(config)
  const { Model, Message, LiveQueryDefinition, subscriptions, Feeds } = parts
  const LiveQueryComposition = LiveQueryDefinition.makeComposition()
  const init = LiveQueryComposition.makeInit(parts.init)
  const prepare = () =>
    LiveQueryComposition.prepareBlock({
      init,
      update: LiveQueryComposition.makeUpdate(parts.update),
      operations: {
        requestWatch: parts.requestWatch,
        requestUnwatch: Message.RequestedUnwatch,
        requestPause: Message.RequestedPause,
        requestResume: Message.RequestedResume,
      },
      subscriptions,
      EffectsLayer: Layer.empty,
      hostHandlers: [Feeds],
    })
  const block: Block.FromAssemblyWithOutMessage<typeof Model, typeof prepare> =
    Block.assemble(prepare)

  return enrichLiveQuery(block, toLiveQueryApi(parts), block.operations)
}

const makeCanonicalLiveQuery = <
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
>(
  config: ResolvedLiveQueryConfig<Name, S, SI, E, EI, M, MI, Fields>,
  handler: Effect.Effect<
    (
      args: KeyedArgs<Fields>,
      maybeAfter: Option.Option<number>,
    ) => Stream.Stream<LiveQueryEntry<S, M>, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
): CanonicalLiveQuery<
  Name,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields,
  HandlerRequirements,
  BuildError,
  BuildRequirements
> => {
  const parts = makeLiveQueryParts(config)
  const { Model, Message, LiveQueryDefinition, subscriptions } = parts
  const LiveQueryComposition = LiveQueryDefinition.makeComposition()
  const init = LiveQueryComposition.makeInit(parts.init)
  const prepare = () =>
    LiveQueryComposition.prepareBlock({
      init,
      update: LiveQueryComposition.makeUpdate(parts.update),
      operations: {
        requestWatch: parts.requestWatch,
        requestUnwatch: Message.RequestedUnwatch,
        requestPause: Message.RequestedPause,
        requestResume: Message.RequestedResume,
      },
      subscriptions,
      EffectsLayer: parts.toLayer(handler),
    })
  const block: Block.FromAssemblyWithOutMessage<typeof Model, typeof prepare> =
    Block.assemble(prepare)

  return enrichLiveQuery(block, toLiveQueryApi(parts), block.operations)
}

export function defineLiveQuery<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
>(
  config: ResolvedLiveQueryConfig<Name, S, SI, E, EI, M, MI, Fields>,
): LiveQuery<Name, S, SI, E, EI, M, MI, Fields>
export function defineLiveQuery<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
>(
  config: ResolvedLiveQueryConfig<Name, S, SI, E, EI, M, MI, Fields>,
  handler: Effect.Effect<
    (
      args: KeyedArgs<Fields>,
      maybeAfter: Option.Option<number>,
    ) => Stream.Stream<LiveQueryEntry<S, M>, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
): CanonicalLiveQuery<
  Name,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields,
  HandlerRequirements,
  BuildError,
  BuildRequirements
>
export function defineLiveQuery<
  Name extends string,
  S,
  SI,
  E,
  EI,
  M,
  MI,
  Fields extends SyncFields,
  HandlerRequirements,
  BuildError,
  BuildRequirements,
>(
  config: ResolvedLiveQueryConfig<Name, S, SI, E, EI, M, MI, Fields>,
  handler?: Effect.Effect<
    (
      args: KeyedArgs<Fields>,
      maybeAfter: Option.Option<number>,
    ) => Stream.Stream<LiveQueryEntry<S, M>, E, HandlerRequirements>,
    BuildError,
    BuildRequirements
  > &
    ValidateConstructionRequirements<BuildRequirements>,
) {
  if (handler === undefined) {
    return makeHostLiveQuery(config)
  }

  return makeCanonicalLiveQuery(config, handler)
}

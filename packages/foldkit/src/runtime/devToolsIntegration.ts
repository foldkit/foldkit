import {
  Array,
  Effect,
  Fiber,
  Option,
  PubSub,
  Result,
  Schema,
  Scope,
  Stream,
  SubscriptionRef,
} from 'effect'

import { isBlockMessage } from '../blocks/engine.js'
import { extractBlockInfo, isTagged } from '../devTools/blockPath.js'
import {
  type CommandRecord,
  type DevToolsStore,
  type MountRecord,
  createDevToolsStore,
} from '../devTools/store.js'
import {
  type PrepareDispatch,
  startWebSocketBridge,
} from '../devTools/webSocketBridge.js'
import {
  MountRuntime,
  MountTracker,
  type ViewState,
  liveViewStateChanges,
} from '../mount/index.js'
import {
  type RuntimeDevToolsConfig,
  resolveDevToolsConfig,
  resolveDevToolsKeyframeInterval,
  resolveDevToolsMaxEntries,
  resolveExcludeFromHistoryTags,
} from './devToolsConfig.js'

/** The tag `excludeFromHistory` matches: a child Message addressed to a Block
 *  instance is matched by its own tag. */
const historyTag = (message: unknown): string | undefined => {
  const inner = isBlockMessage(message) ? message.message : message
  return isTagged(inner) ? inner._tag : undefined
}

/** The Mount starts and ends recorded since the last drain. */
export type MountEvents = Readonly<{
  starts: ReadonlyArray<MountRecord>
  ends: ReadonlyArray<MountRecord>
}>

/** A Command invocation and its runtime-local identity for DevTools history. */
export type RecordableCommand = Readonly<{
  id: number
  command: Readonly<{
    name: string
    args?: Record<string, unknown>
  }>
}>

/** The replay bridge the render side hands the store when it is installed. */
export type DevToolsRenderBridge = Readonly<{
  renderReplay: (model: unknown) => Effect.Effect<void>
  markRenderPending: Effect.Effect<void>
}>

/**
 * Everything the runtime needs from DevTools, whether or not DevTools is
 * configured. The Mount tracker and runtime, the view state, and the pause
 * check exist from boot, and the tracker records only once the store
 * exists. `installDevToolsStore` creates the store, mounts the overlay,
 * and starts the WebSocket bridge once the render side can supply the
 * replay bridge, and does nothing when DevTools is off. The recording
 * helpers no-op until the store exists.
 */
export type DevToolsIntegration<Model, Message> = Readonly<{
  isRecordingCommands: boolean
  mountTracker: typeof MountTracker.Service
  mountRuntime: typeof MountRuntime.Service
  drainMountEvents: () => MountEvents
  readViewState: () => ViewState
  setViewState: (nextViewState: ViewState) => void
  isPausedNow: () => boolean
  installDevToolsStore: (
    bridge: DevToolsRenderBridge,
  ) => Effect.Effect<void, never, Scope.Scope>
  resumeDevTools: Effect.Effect<void>
  recordInit: (
    initModel: Model,
    initCommands: ReadonlyArray<RecordableCommand>,
  ) => Effect.Effect<void>
  recordMessage: (
    message: Message,
    currentModel: Model,
    nextModel: Model,
    commands: ReadonlyArray<RecordableCommand>,
  ) => Effect.Effect<Option.Option<number>>
  recordCommandResult: (id: number, message: Message) => void
  attachRenderedMounts: () => void
}>

const toCommandRecord = ({ id, command }: RecordableCommand): CommandRecord =>
  command.args !== undefined
    ? {
        id,
        name: command.name,
        args: command.args,
        maybeBlockPath: Option.none(),
      }
    : { id, name: command.name, maybeBlockPath: Option.none() }

/**
 * Builds the DevTools integration for one runtime from the `devTools`
 * config. `update` and `maybeFreezeModel` drive time-travel replay.
 * `prepareDispatch` admits decoded WebSocket input and captures the queue
 * guard that belongs to that exact admission. `provideDispatchServices`
 * supplies application Services used by Message decoding while installation
 * retains its active Scope for bridge finalizers.
 */
export const makeDevToolsIntegration = <Model, Message, DispatchServices>({
  devTools,
  update,
  maybeFreezeModel,
  prepareDispatch,
  provideDispatchServices,
}: Readonly<{
  devTools: RuntimeDevToolsConfig<DispatchServices> | undefined
  update: (model: Model, message: Message) => Readonly<{ model: Model }>
  maybeFreezeModel: (model: Model) => Model
  prepareDispatch: PrepareDispatch
  provideDispatchServices: <A>(
    effect: Effect.Effect<A, never, DispatchServices>,
  ) => Effect.Effect<A>
}>): Effect.Effect<DevToolsIntegration<Model, Message>> =>
  Effect.gen(function* () {
    const resolvedDevTools = resolveDevToolsConfig(devTools)
    const excludeFromHistoryTags = resolveExcludeFromHistoryTags(devTools)
    const devToolsMaxEntries = resolveDevToolsMaxEntries(devTools)
    const devToolsKeyframeInterval = resolveDevToolsKeyframeInterval(devTools)

    let currentViewState: ViewState = 'Live'
    const maybeViewStatePubSub = Option.isSome(resolvedDevTools)
      ? Option.some(
          yield* PubSub.unbounded<ViewState>({
            replay: 1,
          }),
        )
      : Option.none()
    const viewStateChanges = Option.match(maybeViewStatePubSub, {
      onNone: () => liveViewStateChanges,
      onSome: viewStatePubSub => {
        PubSub.publishUnsafe(viewStatePubSub, currentViewState)
        return Stream.fromPubSub(viewStatePubSub)
      },
    })
    const setViewState = (nextViewState: ViewState): void => {
      if (nextViewState === currentViewState) {
        return
      }
      currentViewState = nextViewState
      if (Option.isSome(maybeViewStatePubSub)) {
        PubSub.publishUnsafe(maybeViewStatePubSub.value, nextViewState)
      }
    }
    const readViewState = (): ViewState => currentViewState

    // NOTE: the DevTools store is installed at most once during boot and
    // never replaced. Caching it in a closure variable avoids a
    // `Ref.get` on every message and on every render frame (the
    // store powers the pause check). Plain `null` rather than `Option`:
    // the hot path only ever presence-checks it, and the check should
    // stay a bare comparison.
    let devToolsStore: DevToolsStore | null = null

    const prepareExternalDispatch: PrepareDispatch = message => {
      const maybeTag = historyTag(message)
      if (maybeTag !== undefined && excludeFromHistoryTags.has(maybeTag)) {
        return Result.fail(
          `Message ${maybeTag} is excluded from DevTools history and cannot be dispatched externally.`,
        )
      }
      return prepareDispatch(message)
    }

    const mountFibers = new Set<Fiber.Fiber<void>>()

    const mountRuntime = MountRuntime.of({
      captureViewStateChanges: () =>
        Stream.concat(Stream.make(currentViewState), viewStateChanges).pipe(
          Stream.changes,
        ),
      registerFiber: fiber => {
        mountFibers.add(fiber)
        fiber.addObserver(() => mountFibers.delete(fiber))
      },
      interruptFibers: Effect.suspend(() => Fiber.interruptAll(mountFibers)),
    })

    const isPausedNow = (): boolean =>
      devToolsStore !== null &&
      SubscriptionRef.getUnsafe(devToolsStore.stateRef).isPaused

    // NOTE: recording is gated on the DevTools store because the store
    // is the only consumer. Without the gate every Mount start and end
    // in a production frame would allocate a record just to be sliced
    // and dropped.
    const mountStartBuffer: Array<MountRecord> = []
    const mountEndBuffer: Array<MountRecord> = []
    const mountTracker: typeof MountTracker.Service = {
      started: (name, args) => {
        if (devToolsStore === null) {
          return
        }
        mountStartBuffer.push(args === undefined ? { name } : { name, args })
      },
      ended: (name, args) => {
        if (devToolsStore === null) {
          return
        }
        mountEndBuffer.push(args === undefined ? { name } : { name, args })
      },
    }
    const drainMountEvents = (): MountEvents => {
      const starts = mountStartBuffer.slice()
      const ends = mountEndBuffer.slice()
      mountStartBuffer.length = 0
      mountEndBuffer.length = 0
      return { starts, ends }
    }

    const installDevToolsStore = ({
      renderReplay,
      markRenderPending,
    }: DevToolsRenderBridge): Effect.Effect<void, never, Scope.Scope> =>
      Option.match(resolvedDevTools, {
        onNone: () => Effect.void,
        onSome: ({ position, mode, maybeBanner, maybeOverlay }) =>
          Effect.gen(function* () {
            // NOTE: when excludeFromHistory is active, the runtime drops
            // excluded Messages from the recorded history. Replay walks the
            // recorded entries forward from the nearest keyframe. With
            // exclusion, the dropped Messages aren't in that walk, so any
            // cumulative state they would have produced is missing from the
            // replayed model. Setting keyframeInterval to 1 stores a full
            // snapshot on every recorded entry, so time-travel becomes a
            // direct lookup that reflects the real live state at the moment
            // the entry was recorded.
            const isExcludingMessages = excludeFromHistoryTags.size > 0
            const store = yield* createDevToolsStore(
              {
                /* eslint-disable @typescript-eslint/consistent-type-assertions */
                replay: (model, message) => {
                  const replayUpdate = update(
                    model as Model,
                    message as Message,
                  )
                  return maybeFreezeModel(replayUpdate.model)
                },
                /* eslint-enable @typescript-eslint/consistent-type-assertions */
                render: renderReplay,
                markRenderPending,
              },
              {
                ...(devToolsKeyframeInterval !== undefined && {
                  keyframeInterval: devToolsKeyframeInterval,
                }),
                ...(devToolsMaxEntries !== undefined && {
                  maxEntries: devToolsMaxEntries,
                }),
                // NOTE: exclusion forces keyframeInterval to 1 regardless of any
                // configured value, since excluded Messages are never replayed
                // and a denser interval would leave gaps in the replayed model.
                // Spread last so it wins over `keyframeInterval` above.
                ...(isExcludingMessages && { keyframeInterval: 1 }),
              },
            )
            devToolsStore = store
            // NOTE: the boot records init through `recordInit` after the init
            // render, so the mount buffer reflects the Mounts that fired on the
            // first paint.
            yield* Option.match(maybeOverlay, {
              onNone: () => Effect.void,
              onSome: overlay => overlay(store, position, mode, maybeBanner),
            })

            if (import.meta.hot) {
              const maybeMessageSchema =
                devTools !== undefined && devTools !== false
                  ? Option.fromNullishOr(devTools.dispatchSchema)
                  : Option.none<
                      Schema.Codec<any, any, DispatchServices, unknown>
                    >()
              const runtimeScope = yield* Effect.scope
              yield* provideDispatchServices(
                startWebSocketBridge(
                  store,
                  import.meta.hot,
                  maybeMessageSchema,
                  prepareExternalDispatch,
                ).pipe(Effect.provideService(Scope.Scope, runtimeScope)),
              )
            }
          }),
      })

    const recordInit = (
      initModel: Model,
      initCommands: ReadonlyArray<RecordableCommand>,
    ): Effect.Effect<void> =>
      Effect.gen(function* () {
        const initMountEvents = drainMountEvents()
        if (devToolsStore !== null) {
          yield* devToolsStore.recordInit(
            initModel,
            Array.map(initCommands, toCommandRecord),
            initMountEvents.starts,
          )
        }
      })

    const attachRenderedMounts = (): void => {
      if (devToolsStore !== null) {
        const mountEvents = drainMountEvents()
        Effect.runFork(
          devToolsStore.attachRenderedMounts(
            mountEvents.starts,
            mountEvents.ends,
          ),
        )
      }
    }

    const recordMessage = (
      message: Message,
      currentModel: Model,
      nextModel: Model,
      commands: ReadonlyArray<RecordableCommand>,
    ): Effect.Effect<Option.Option<number>> => {
      // NOTE: the runtime starts this Effect with `Effect.runFork`, not
      // `Effect.runSync`. A DevTools fiber may hold the state Ref's permit
      // across a yield, so the recording fiber must be able to park until
      // the permit is free. The prepared dispatch joins that same fiber to
      // receive the exact history index assigned by the store.
      if (devToolsStore !== null) {
        const store = devToolsStore
        const tag = historyTag(message) ?? ''
        const isModelChanged = currentModel !== nextModel
        if (!excludeFromHistoryTags.has(tag)) {
          return Effect.map(
            store.recordMessage(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              message as Message & { _tag: string },
              currentModel,
              nextModel,
              Array.map(commands, toCommandRecord),
              isModelChanged,
            ),
            Option.some,
          )
        } else if (isModelChanged) {
          return Effect.as(store.updateLatestModel(nextModel), Option.none())
        }
      }
      return Effect.succeed(Option.none())
    }

    const recordCommandResult = (id: number, message: Message): void => {
      if (devToolsStore === null) {
        return
      }

      const blockPath = isTagged(message)
        ? extractBlockInfo(message._tag, message).blockPath
        : []

      Effect.runFork(devToolsStore.recordResolvedCommand(id, blockPath))
    }

    const resumeDevTools = Effect.suspend(() =>
      devToolsStore !== null ? devToolsStore.resume : Effect.void,
    )

    return {
      isRecordingCommands: Option.isSome(resolvedDevTools),
      mountTracker,
      mountRuntime,
      drainMountEvents,
      readViewState,
      setViewState,
      isPausedNow,
      installDevToolsStore,
      resumeDevTools,
      recordInit,
      recordMessage,
      recordCommandResult,
      attachRenderedMounts,
    }
  })

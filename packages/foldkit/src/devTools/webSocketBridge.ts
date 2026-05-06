import {
  Array,
  Cause,
  Effect,
  Exit,
  HashMap,
  Match,
  Option,
  Order,
  Schema as S,
  SubscriptionRef,
  pipe,
} from 'effect'

import { OptionExt } from '../effectExtensions/index.js'
import {
  type Event,
  EventConnected,
  EventDisconnected,
  EventFrame,
  KeyframeInfo,
  type Request,
  RequestFrame,
  type Response,
  ResponseDispatched,
  ResponseError,
  ResponseFrame,
  ResponseInit,
  ResponseKeyframes,
  ResponseMessage,
  ResponseMessages,
  ResponseModel,
  ResponseReplayed,
  ResponseResumed,
  ResponseRuntimeState,
  RuntimeInfo,
} from './protocol.js'
import { toInspectableValue, toSerializedEntry } from './serialize.js'
import { type DevToolsStore, INIT_INDEX } from './store.js'
import {
  type PathResolution,
  formatPathNotFound,
  resolvePath,
  summarizeValue,
} from './summarize.js'

type Hot = NonNullable<ImportMeta['hot']>

const REQUEST_CHANNEL = 'foldkit:devTools:request'
const RESPONSE_CHANNEL = 'foldkit:devTools:response'
const EVENT_CHANNEL = 'foldkit:devTools:event'

const generateConnectionId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const currentAbsoluteIndex = (
  entriesLength: number,
  startIndex: number,
): number => (entriesLength === 0 ? INIT_INDEX : startIndex + entriesLength - 1)

/**
 * Start the browser-side WebSocket bridge that exposes a Foldkit runtime's
 * DevToolsStore to an external MCP server (via the Vite plugin relay).
 *
 * Emits `EventConnected` on startup so the relay tracks this runtime.
 * Listens on the request channel for `RequestFrame`s targeted at this
 * connection's id and replies with the matching `ResponseFrame`. Emits
 * `EventDisconnected` on tab close or HMR module dispose so the relay can
 * remove this runtime from its connected set.
 *
 * `dispatch` enqueues a Message into the runtime's message queue; the bridge
 * uses it to fulfill `RequestDispatchMessage` after decoding the payload
 * against `maybeMessageSchema`. When `maybeMessageSchema` is `None`, dispatch
 * requests are rejected with an informative error.
 *
 * Production-safe: callers must check `import.meta.hot` is defined before
 * invoking this. The function assumes a live HMR connection.
 */
export const startWebSocketBridge = (
  store: DevToolsStore,
  hot: Hot,
  dispatch: (message: unknown) => Effect.Effect<void>,
  maybeMessageSchema: Option.Option<S.Codec<any, any>>,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const connectionId = generateConnectionId()
    const capturedContext = yield* Effect.context<never>()

    const encodeEventFrame = S.encodeUnknownSync(EventFrame)
    const encodeResponseFrame = S.encodeUnknownSync(ResponseFrame)

    const sendEvent = (event: Event): void => {
      hot.send(
        EVENT_CHANNEL,
        encodeEventFrame({
          maybeConnectionId: Option.some(connectionId),
          event,
        }),
      )
    }

    const sendResponse = (id: string, response: Response): void => {
      hot.send(RESPONSE_CHANNEL, encodeResponseFrame({ id, response }))
    }

    sendEvent(
      EventConnected({
        runtime: RuntimeInfo.make({
          connectionId,
          url: window.location.href,
          title: document.title,
        }),
      }),
    )

    const handleRequest = (id: string, request: Request) =>
      Effect.gen(function* () {
        const response = yield* dispatchRequest(
          store,
          dispatch,
          maybeMessageSchema,
          request,
        )
        sendResponse(id, response)
      })

    const handleRequestFrame = (frame: unknown): void => {
      const decoded = S.decodeUnknownExit(RequestFrame)(frame)
      Exit.match(decoded, {
        onFailure: error => {
          console.warn('[foldkit:devTools] malformed request frame', error)
        },
        onSuccess: ({ id, maybeConnectionId, request }) => {
          const isForUs = Option.exists(
            maybeConnectionId,
            targetId => targetId === connectionId,
          )
          if (!isForUs) {
            return
          }
          Effect.runForkWith(capturedContext)(handleRequest(id, request))
        },
      })
    }

    hot.on(REQUEST_CHANNEL, handleRequestFrame)

    let hasEmittedDisconnect = false
    const emitDisconnect = (): void => {
      if (hasEmittedDisconnect) {
        return
      }
      hasEmittedDisconnect = true
      sendEvent(EventDisconnected({ connectionId }))
    }

    hot.dispose(() => {
      emitDisconnect()
      hot.off(REQUEST_CHANNEL, handleRequestFrame)
    })

    window.addEventListener('beforeunload', emitDisconnect, { once: true })
  })

const presentResolution = (
  resolution: PathResolution,
  expand: boolean,
): Response =>
  Match.value(resolution).pipe(
    Match.tag('Found', ({ value, atPath }) =>
      ResponseModel({
        value: expand ? value : summarizeValue(value),
        atPath,
        summarized: !expand,
      }),
    ),
    Match.orElse(notFound =>
      ResponseError({ reason: formatPathNotFound(notFound) }),
    ),
  )

const readModelResponse = (
  store: DevToolsStore,
  index: number,
  maybePath: Option.Option<string>,
  expand: boolean,
): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const model = yield* store.getModelAtIndex(index)
    const path = Option.getOrElse(maybePath, () => 'root')
    return presentResolution(
      resolvePath(toInspectableValue(model), path),
      expand,
    )
  }).pipe(
    Effect.catchCause(cause =>
      Effect.succeed(
        ResponseError({
          reason: `Failed to read Model at index ${index}: ${Cause.pretty(cause)}`,
        }),
      ),
    ),
  )

const dispatchRequest = (
  store: DevToolsStore,
  dispatch: (message: unknown) => Effect.Effect<void>,
  maybeMessageSchema: Option.Option<S.Codec<any, any>>,
  request: Request,
): Effect.Effect<Response> =>
  Match.value(request).pipe(
    Match.tagsExhaustive({
      RequestGetModel: ({ maybePath, expand }) =>
        Effect.gen(function* () {
          const state = yield* SubscriptionRef.get(store.stateRef)
          const index = currentAbsoluteIndex(
            state.entries.length,
            state.startIndex,
          )
          return yield* readModelResponse(store, index, maybePath, expand)
        }),

      RequestGetModelAt: ({ index, maybePath, expand }) =>
        readModelResponse(store, index, maybePath, expand),

      RequestListMessages: ({ limit, maybeSinceIndex }) =>
        Effect.gen(function* () {
          const state = yield* SubscriptionRef.get(store.stateRef)
          const startAbsolute = Option.getOrElse(
            maybeSinceIndex,
            () => state.startIndex,
          )
          const startRelative = Math.max(0, startAbsolute - state.startIndex)

          const sliced = pipe(
            state.entries,
            Array.drop(startRelative),
            Array.take(limit),
            Array.map((entry, sliceIndex) =>
              toSerializedEntry(
                entry,
                state.startIndex + startRelative + sliceIndex,
              ),
            ),
          )

          const totalCount = state.startIndex + state.entries.length
          const nextIndex = state.startIndex + startRelative + sliced.length
          const maybeNextIndex = OptionExt.when(
            nextIndex < totalCount,
            nextIndex,
          )

          return ResponseMessages({ entries: sliced, maybeNextIndex })
        }),

      RequestGetMessage: ({ index }) =>
        Effect.gen(function* () {
          const state = yield* SubscriptionRef.get(store.stateRef)
          const relative = index - state.startIndex
          const maybeEntry = Array.get(state.entries, relative)

          return yield* Option.match(maybeEntry, {
            onNone: () =>
              Effect.succeed(
                ResponseError({
                  reason: `No entry at index ${index} (have ${state.startIndex} to ${state.startIndex + state.entries.length - 1})`,
                }),
              ),
            onSome: entry =>
              Effect.succeed(
                ResponseMessage({
                  entry: toSerializedEntry(entry, index),
                }),
              ),
          })
        }),

      RequestListKeyframes: () =>
        Effect.gen(function* () {
          const state = yield* SubscriptionRef.get(store.stateRef)
          const sortedKeyframeIndices = pipe(
            state.keyframes,
            HashMap.keys,
            Array.fromIterable,
            Array.sort(Order.Number),
          )
          const indicesWithInit = Option.match(state.maybeInitModel, {
            onNone: () => sortedKeyframeIndices,
            onSome: () => [INIT_INDEX, ...sortedKeyframeIndices],
          })
          const keyframes = indicesWithInit.map(index =>
            KeyframeInfo.make({ index }),
          )
          return ResponseKeyframes({ keyframes })
        }),

      RequestReplayToKeyframe: ({ keyframeIndex }) =>
        pipe(
          Effect.gen(function* () {
            yield* store.jumpTo(keyframeIndex)
            const model = yield* store.getModelAtIndex(keyframeIndex)
            return ResponseReplayed({ model: toInspectableValue(model) })
          }),
          Effect.catchCause(cause =>
            Effect.succeed(
              ResponseError({
                reason: `Failed to replay to keyframe ${keyframeIndex}: ${Cause.pretty(cause)}`,
              }),
            ),
          ),
        ),

      RequestResume: () =>
        Effect.gen(function* () {
          yield* store.resume
          return ResponseResumed()
        }).pipe(
          Effect.catchCause(cause =>
            Effect.succeed(
              ResponseError({
                reason: `Failed to resume: ${Cause.pretty(cause)}`,
              }),
            ),
          ),
        ),

      RequestDispatchMessage: ({ message }) =>
        Option.match(maybeMessageSchema, {
          onNone: () =>
            Effect.succeed(
              ResponseError({
                reason:
                  'Cannot dispatch: DevToolsConfig.Message not configured. Pass your Message Schema to enable dispatch.',
              }),
            ),
          onSome: messageSchema =>
            Effect.gen(function* () {
              const decodedMessage =
                yield* S.decodeUnknownEffect(messageSchema)(message)
              const stateBefore = yield* SubscriptionRef.get(store.stateRef)
              const acceptedAtIndex =
                stateBefore.startIndex + stateBefore.entries.length
              yield* dispatch(decodedMessage)
              return ResponseDispatched({ acceptedAtIndex })
            }).pipe(
              Effect.catch(error =>
                Effect.succeed(
                  ResponseError({
                    reason: `Invalid Message: ${error instanceof Error ? error.message : String(error)}\n\nReceived (typeof ${typeof message}): ${JSON.stringify(message)}`,
                  }),
                ),
              ),
            ),
        }),

      RequestListRuntimes: () =>
        Effect.succeed(
          ResponseError({
            reason:
              'RequestListRuntimes is plugin-handled and should not reach the runtime bridge',
          }),
        ),

      RequestGetInit: () =>
        Effect.gen(function* () {
          const state = yield* SubscriptionRef.get(store.stateRef)
          return ResponseInit({
            maybeModel: Option.map(state.maybeInitModel, toInspectableValue),
            commandNames: state.initCommandNames,
            mountStartNames: state.initMountStartNames,
          })
        }),

      RequestGetRuntimeState: () =>
        Effect.gen(function* () {
          const state = yield* SubscriptionRef.get(store.stateRef)
          const currentIndex = currentAbsoluteIndex(
            state.entries.length,
            state.startIndex,
          )
          return ResponseRuntimeState({
            currentIndex,
            startIndex: state.startIndex,
            totalEntries: state.entries.length,
            isPaused: state.isPaused,
            maybePausedAtIndex: OptionExt.when(
              state.isPaused,
              state.pausedAtIndex,
            ),
            hasInitModel: Option.isSome(state.maybeInitModel),
          })
        }),
    }),
  )

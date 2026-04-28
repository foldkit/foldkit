import {
  Array,
  Cause,
  Effect,
  Either,
  HashMap,
  JSONSchema,
  Match,
  Option,
  Order,
  Runtime,
  Schema as S,
  SubscriptionRef,
  pipe,
} from 'effect'

import { OptionExt } from '../effectExtensions/index.js'
import {
  type Event,
  EventConnected,
  EventDisconnected,
  KeyframeInfo,
  type Request,
  RequestFrame,
  type Response,
  ResponseDispatched,
  ResponseError,
  type ResponseFrame,
  ResponseKeyframes,
  ResponseMessage,
  ResponseMessages,
  ResponseModel,
  ResponseReplayed,
  ResponseResumed,
  RuntimeInfo,
} from './protocol.js'
import { toInspectableValue, toSerializedEntry } from './serialize.js'
import { type DevToolsStore, INIT_INDEX } from './store.js'

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
 * uses it to fulfill `RequestDispatchMessage` after the payload is validated
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
  maybeMessageSchema: Option.Option<S.Schema<any, any, never>>,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const connectionId = generateConnectionId()
    const runtime = yield* Effect.runtime<never>()

    const maybeJsonMessageSchema: Option.Option<unknown> = Option.map(
      maybeMessageSchema,
      schema => JSONSchema.make(schema),
    )

    const sendEvent = (event: Event): void => {
      hot.send(EVENT_CHANNEL, {
        maybeConnectionId: Option.some(connectionId),
        event,
      })
    }

    const sendResponse = (id: string, response: Response): void => {
      const frame: ResponseFrame = { id, response }
      hot.send(RESPONSE_CHANNEL, frame)
    }

    sendEvent(
      EventConnected({
        runtime: RuntimeInfo.make({
          connectionId,
          url: window.location.href,
          title: document.title,
          maybeMessageSchema: maybeJsonMessageSchema,
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
      const decoded = S.decodeUnknownEither(RequestFrame)(frame)
      Either.match(decoded, {
        onLeft: error => {
          console.warn('[foldkit:devTools] malformed request frame', error)
        },
        onRight: ({ id, maybeConnectionId, request }) => {
          const isForUs = Option.exists(
            maybeConnectionId,
            targetId => targetId === connectionId,
          )
          if (!isForUs) {
            return
          }
          Runtime.runFork(runtime)(handleRequest(id, request))
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

const dispatchRequest = (
  store: DevToolsStore,
  dispatch: (message: unknown) => Effect.Effect<void>,
  maybeMessageSchema: Option.Option<S.Schema<any, any, never>>,
  request: Request,
): Effect.Effect<Response> =>
  Match.value(request).pipe(
    Match.tagsExhaustive({
      RequestGetModel: () =>
        Effect.gen(function* () {
          const state = yield* SubscriptionRef.get(store.stateRef)
          const index = currentAbsoluteIndex(
            state.entries.length,
            state.startIndex,
          )
          return yield* pipe(
            index,
            store.getModelAtIndex,
            Effect.map(model =>
              ResponseModel({ model: toInspectableValue(model) }),
            ),
            Effect.catchAllCause(cause =>
              Effect.succeed(
                ResponseError({
                  reason: `Failed to read current Model: ${Cause.pretty(cause)}`,
                }),
              ),
            ),
          )
        }),

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
              pipe(
                {
                  modelBefore: store.getModelAtIndex(index - 1),
                  modelAfter: store.getModelAtIndex(index),
                },
                Effect.all,
                Effect.map(({ modelBefore, modelAfter }) =>
                  ResponseMessage({
                    entry: toSerializedEntry(entry, index),
                    modelBefore: toInspectableValue(modelBefore),
                    modelAfter: toInspectableValue(modelAfter),
                  }),
                ),
                Effect.catchAllCause(cause =>
                  Effect.succeed(
                    ResponseError({
                      reason: `Failed to read Models around index ${index}: ${Cause.pretty(cause)}`,
                    }),
                  ),
                ),
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
            Array.sort(Order.number),
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
          Effect.catchAllCause(cause =>
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
          Effect.catchAllCause(cause =>
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
                yield* S.decodeUnknown(messageSchema)(message)
              const stateBefore = yield* SubscriptionRef.get(store.stateRef)
              const acceptedAtIndex =
                stateBefore.startIndex + stateBefore.entries.length
              yield* dispatch(decodedMessage)
              return ResponseDispatched({ acceptedAtIndex })
            }).pipe(
              Effect.catchAll(error =>
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
    }),
  )

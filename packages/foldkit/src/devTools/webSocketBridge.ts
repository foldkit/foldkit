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
  Scope,
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
  MessageSchemaDocumentResult,
  MessageSchemaIndexResult,
  type Request,
  RequestFrame,
  type Response,
  ResponseDispatched,
  ResponseError,
  ResponseFrame,
  ResponseInit,
  ResponseKeyframes,
  ResponseMessage,
  ResponseMessageSchema,
  ResponseMessages,
  ResponseModel,
  ResponseReplayed,
  ResponseResumed,
  ResponseRuntimeState,
  RuntimeInfo,
} from './protocol.js'
import {
  diagnoseVariantPath,
  indexMessageSchemaDocument,
  narrowToVariant,
  splitVariantPath,
} from './schemaSummarize.js'
import {
  toInspectableValue,
  toSerializedCommand,
  toSerializedEntry,
  toSerializedMount,
} from './serialize.js'
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

const tryDeriveJsonSchemaDocument = (
  schema: S.Codec<any, any>,
): Option.Option<unknown> => {
  try {
    return Option.some(S.toJsonSchemaDocument(schema))
  } catch (error) {
    console.warn(
      '[foldkit:devTools] Failed to derive JSON Schema from Message Schema; foldkit_get_message_schema will return None.',
      error,
    )
    return Option.none()
  }
}

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
 * against a JSON-canonical derivation of `maybeMessageSchema` (via
 * `Schema.toCodecJson`). The derivation reconstructs runtime values like
 * `Option`, `Date`, `Map`, and `Set` from their JSON-tagged shapes, so
 * application Message Schemas using stdlib types Just Work over dispatch
 * without author-side changes. When `maybeMessageSchema` is `None`, dispatch
 * requests are rejected with an informative error.
 *
 * The bridge also derives a JSON Schema document from `maybeMessageSchema`
 * once at boot (via `Schema.toJsonSchemaDocument`) to fulfill
 * `RequestGetMessageSchema`, so MCP clients can discover the exact Message
 * shapes the runtime accepts without reading the application source. A few
 * AST nodes (symbol-keyed structs, symbol-indexed records, tuples with
 * post-rest elements) cause `Schema.toJsonSchemaDocument` to throw; the
 * derivation is guarded so a failure logs a warning and the schema-discovery
 * tool returns `None` rather than crashing the bridge.
 *
 * Production-safe: callers must check `import.meta.hot` is defined before
 * invoking this. The function assumes a live HMR connection.
 */
export const startWebSocketBridge = (
  store: DevToolsStore,
  hot: Hot,
  dispatch: (message: unknown) => Effect.Effect<void>,
  maybeMessageSchema: Option.Option<S.Codec<any, any>>,
): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const connectionId = generateConnectionId()
    const capturedContext = yield* Effect.context<never>()

    const maybeDispatchSchema = Option.map(maybeMessageSchema, S.toCodecJson)
    const maybeJsonSchemaDocument = Option.flatMap(
      maybeMessageSchema,
      tryDeriveJsonSchemaDocument,
    )

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
          maybeDispatchSchema,
          maybeJsonSchemaDocument,
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

    // NOTE: a disposed runtime must disconnect from the MCP relay and stop
    // answering requests. Without this finalizer, every embed/dispose cycle
    // would leave a ghost connection that keeps responding with the dead
    // runtime's state.
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        emitDisconnect()
        hot.off(REQUEST_CHANNEL, handleRequestFrame)
        window.removeEventListener('beforeunload', emitDisconnect)
      }),
    )
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

const indexResponse = (document: unknown): Response =>
  Option.match(indexMessageSchemaDocument(document), {
    onNone: () =>
      ResponseError({
        reason:
          "Could not index Message Schema: the top-level shape is not a discriminated union of '_tag'-keyed structs. Open an issue if you see this against an Effect Schema released after foldkit's last sync.",
      }),
    onSome: variants =>
      ResponseMessageSchema({
        maybeResult: Option.some(
          MessageSchemaIndexResult({ index: { variants } }),
        ),
      }),
  })

const narrowResponse = (document: unknown, variantPath: string): Response =>
  Option.match(narrowToVariant(document, variantPath), {
    onNone: () => formatUnknownVariantError(document, variantPath),
    onSome: narrowed =>
      ResponseMessageSchema({
        maybeResult: Option.some(
          MessageSchemaDocumentResult({ document: narrowed }),
        ),
      }),
  })

const buildMessageSchemaResponse = (
  maybeJsonSchemaDocument: Option.Option<unknown>,
  maybeVariantTag: Option.Option<string>,
): Response =>
  Option.match(maybeJsonSchemaDocument, {
    onNone: () => ResponseMessageSchema({ maybeResult: Option.none() }),
    onSome: document =>
      Option.match(maybeVariantTag, {
        onNone: () => indexResponse(document),
        onSome: variantTag => narrowResponse(document, variantTag),
      }),
  })

const formatUnknownVariantError = (
  document: unknown,
  variantPath: string,
): Response => {
  const segments = splitVariantPath(variantPath)
  return Option.match(diagnoseVariantPath(document, segments), {
    onNone: () =>
      ResponseError({
        reason: `No Message variant at path '${variantPath}'. The runtime's Message Schema is not a discriminated union of '_tag'-keyed structs.`,
      }),
    onSome: ({ prefix, failingSegment, available }) => {
      const prefixLabel = Array.isReadonlyArrayNonEmpty(prefix)
        ? prefix.join('.')
        : '<top level>'
      const failingIsKnownTag = Option.exists(failingSegment, tag =>
        available.includes(tag),
      )
      const failingTag = Option.getOrElse(failingSegment, () => '')
      const reason = failingIsKnownTag
        ? `No further structure to drill into at path '${variantPath}'. The variant '${failingTag}' at ${prefixLabel} does not carry exactly one tagged-union payload field, which is what the walker steps through. Idiomatic Foldkit Messages have at most one tagged-union field per variant (the 'message' field on Submodel wrappers, or a single value-type union); state surrounding a Submodel call belongs as an argument to the child's update/view, not as a sibling field on the parent Message.`
        : `No Message variant at path '${variantPath}'. Available variants at ${prefixLabel}: ${available.join(', ')}.`
      return ResponseError({ reason })
    },
  })
}

const dispatchRequest = (
  store: DevToolsStore,
  dispatch: (message: unknown) => Effect.Effect<void>,
  maybeDispatchSchema: Option.Option<S.Codec<any, any>>,
  maybeJsonSchemaDocument: Option.Option<unknown>,
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
        Option.match(maybeDispatchSchema, {
          onNone: () =>
            Effect.succeed(
              ResponseError({
                reason:
                  'Cannot dispatch: DevToolsConfig.Message not configured. Pass your Message Schema to enable dispatch.',
              }),
            ),
          onSome: dispatchSchema =>
            Effect.gen(function* () {
              const decodedMessage =
                yield* S.decodeUnknownEffect(dispatchSchema)(message)
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

      RequestGetMessageSchema: ({ maybeVariantTag }) =>
        Effect.succeed(
          buildMessageSchemaResponse(maybeJsonSchemaDocument, maybeVariantTag),
        ),

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
            commands: Array.map(state.initCommands, toSerializedCommand),
            mountStarts: Array.map(state.initMountStarts, toSerializedMount),
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

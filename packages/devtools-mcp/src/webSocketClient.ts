import {
  type Cause,
  Deferred,
  Duration,
  Effect,
  Either,
  Fiber,
  HashMap,
  Option,
  Ref,
  Runtime,
  Schema as S,
  Schedule,
  pipe,
} from 'effect'
import {
  type Request,
  type RequestFrame,
  type Response,
  ResponseFrame,
} from 'foldkit/devtools-protocol'
import { type RawData, WebSocket } from 'ws'

const REQUEST_TIMEOUT = Duration.seconds(10)
const INITIAL_RECONNECT_DELAY = Duration.millis(500)
const MAX_RECONNECT_DELAY = Duration.seconds(30)

type PendingResponses = HashMap.HashMap<
  string,
  Deferred.Deferred<typeof Response.Type, Error>
>

/**
 * A connected WebSocket client to the Foldkit Vite plugin's DevTools relay.
 *
 * Sends typed `Request`s and resolves with the matching `Response`. The
 * `sendRequest` Effect fails with `TimeoutException` when no response arrives
 * within the request timeout window, or with `Error` when the socket is not
 * open or the send throws. Either way, no pending entry leaks.
 *
 * The client transparently reconnects with exponential backoff when the
 * underlying socket closes (e.g. when the user restarts the Vite dev server).
 * Pending response correlators live in a client-owned Ref, not on the socket,
 * so they survive reconnects: in-flight requests time out and future requests
 * succeed once the new socket is open.
 */
export type WebSocketClient = Readonly<{
  sendRequest: (
    request: typeof Request.Type,
    maybeRuntimeId: Option.Option<string>,
  ) => Effect.Effect<typeof Response.Type, Cause.TimeoutError | Error>
  close: Effect.Effect<void>
}>

const generateRequestId = (): string =>
  `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/** Exponential backoff capped at MAX_RECONNECT_DELAY, retried indefinitely. */
const reconnectSchedule = Schedule.exponential(INITIAL_RECONNECT_DELAY).pipe(
  Schedule.modifyDelay(delay =>
    Duration.lessThanOrEqualTo(delay, MAX_RECONNECT_DELAY)
      ? delay
      : MAX_RECONNECT_DELAY,
  ),
)

const attemptOpen = (url: string): Effect.Effect<WebSocket, Error> =>
  Effect.callback<WebSocket, Error>(resume => {
    const socket = new WebSocket(url)
    let settled = false
    socket.once('open', () => {
      if (settled) return
      settled = true
      resume(Effect.succeed(socket))
    })
    socket.once('error', error => {
      if (settled) return
      settled = true
      resume(Effect.fail(error))
    })
    return Effect.sync(() => {
      if (!settled) {
        socket.removeAllListeners()
        socket.close()
      }
    })
  })

const waitForClose = (socket: WebSocket): Effect.Effect<void> =>
  Effect.callback<void>(resume => {
    const isAlreadyClosing =
      socket.readyState === WebSocket.CLOSED ||
      socket.readyState === WebSocket.CLOSING

    if (isAlreadyClosing) {
      resume(Effect.void)
      return undefined
    } else {
      const handler = (): void => {
        resume(Effect.void)
      }
      socket.once('close', handler)
      return Effect.sync(() => {
        socket.off('close', handler)
      })
    }
  })

/**
 * Open a WebSocket connection to the Foldkit Vite plugin's DevTools relay.
 * The Effect succeeds once the initial connection is open and ready for
 * traffic. It fails with the underlying `Error` if the *first* connection
 * cannot be opened. Subsequent disconnects reconnect transparently.
 */
export const connectWebSocketClient = (
  url: string,
): Effect.Effect<WebSocketClient, Error> =>
  Effect.gen(function* () {
    const initialSocket = yield* attemptOpen(url)
    yield* Effect.sync(() =>
      console.error(`[foldkit-devtools-mcp] connected to ${url}`),
    )

    const pendingResponsesRef = yield* Ref.make<PendingResponses>(
      HashMap.empty(),
    )
    const currentSocketRef = yield* Ref.make(initialSocket)
    const isManuallyClosedRef = yield* Ref.make(false)
    const runtime = yield* Effect.context<never>()

    const attachMessageHandler = (socket: WebSocket): void => {
      socket.on('message', raw => {
        Runtime.runFork(runtime)(
          handleIncomingMessage(raw, pendingResponsesRef),
        )
      })
      socket.on('error', error => {
        console.error(`[foldkit-devtools-mcp] socket error: ${error.message}`)
      })
    }

    attachMessageHandler(initialSocket)

    const reconnectLoop: Effect.Effect<void> = Effect.gen(function* () {
      const socket = yield* Ref.get(currentSocketRef)
      yield* waitForClose(socket)

      const isManual = yield* Ref.get(isManuallyClosedRef)
      if (isManual) {
        return
      }

      yield* Effect.sync(() =>
        console.error(
          '[foldkit-devtools-mcp] connection lost, reconnecting with backoff',
        ),
      )

      const newSocket = yield* pipe(
        attemptOpen(url),
        Effect.tapError(error =>
          Effect.sync(() =>
            console.error(
              `[foldkit-devtools-mcp] reconnect attempt failed: ${error.message}`,
            ),
          ),
        ),
        Effect.retry(reconnectSchedule),
        Effect.orDie,
      )

      yield* Effect.sync(() =>
        console.error(`[foldkit-devtools-mcp] reconnected to ${url}`),
      )
      attachMessageHandler(newSocket)
      yield* Ref.set(currentSocketRef, newSocket)
      yield* reconnectLoop
    })

    const reconnectFiber = yield* Effect.forkDetach(reconnectLoop)

    const sendRequest = (
      request: typeof Request.Type,
      maybeRuntimeId: Option.Option<string>,
    ): Effect.Effect<typeof Response.Type, Cause.TimeoutError | Error> =>
      Effect.gen(function* () {
        const id = generateRequestId()
        const deferred = yield* Deferred.make<typeof Response.Type, Error>()
        yield* Ref.update(pendingResponsesRef, HashMap.set(id, deferred))

        const socket = yield* Ref.get(currentSocketRef)

        if (socket.readyState !== WebSocket.OPEN) {
          yield* Ref.update(pendingResponsesRef, HashMap.remove(id))
          return yield* Effect.fail(
            new Error(
              'Socket not open. The dev server may have just restarted; the MCP client is reconnecting. Retry the tool call in a moment.',
            ),
          )
        }

        const frame: typeof RequestFrame.Type = {
          id,
          maybeConnectionId: maybeRuntimeId,
          request,
        }

        yield* Effect.try({
          try: () => socket.send(JSON.stringify(frame)),
          catch: error =>
            error instanceof Error
              ? error
              : new Error(`Failed to send request: ${String(error)}`),
        }).pipe(
          Effect.tapError(() =>
            Ref.update(pendingResponsesRef, HashMap.remove(id)),
          ),
        )

        return yield* Deferred.await(deferred).pipe(
          Effect.timeout(REQUEST_TIMEOUT),
          Effect.onError(() =>
            Ref.update(pendingResponsesRef, HashMap.remove(id)),
          ),
        )
      })

    const close: Effect.Effect<void> = Effect.gen(function* () {
      yield* Ref.set(isManuallyClosedRef, true)
      const socket = yield* Ref.get(currentSocketRef)
      yield* Effect.sync(() => socket.close())
      yield* Fiber.interrupt(reconnectFiber)
    })

    return { sendRequest, close }
  })

const handleIncomingMessage = (
  raw: RawData,
  pendingResponsesRef: Ref.Ref<PendingResponses>,
): Effect.Effect<void> => {
  const decoded = S.decodeUnknownExit(S.fromJsonString(ResponseFrame))(
    raw.toString(),
  )
  return Either.match(decoded, {
    onLeft: error =>
      Effect.sync(() =>
        console.error('[foldkit-devtools-mcp] failed to decode frame', error),
      ),
    onRight: responseFrame =>
      Effect.gen(function* () {
        const map = yield* Ref.get(pendingResponsesRef)
        const maybeDeferred = HashMap.get(map, responseFrame.id)
        yield* Option.match(maybeDeferred, {
          onNone: () => Effect.void,
          onSome: deferred =>
            Effect.gen(function* () {
              yield* Ref.update(
                pendingResponsesRef,
                HashMap.remove(responseFrame.id),
              )
              yield* Deferred.succeed(deferred, responseFrame.response)
            }),
        })
      }),
  })
}

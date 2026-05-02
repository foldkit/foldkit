import {
  type Cause,
  Console,
  Deferred,
  Duration,
  Effect,
  Exit,
  Fiber,
  HashMap,
  Option,
  Ref,
  Schema as S,
  Schedule,
  pipe,
} from 'effect'
import {
  type Request,
  RequestFrame,
  type Response,
  ResponseFrame,
} from 'foldkit/devtools-protocol'
import { type RawData, WebSocket } from 'ws'

const REQUEST_TIMEOUT = Duration.seconds(10)
const INITIAL_RECONNECT_DELAY = Duration.millis(500)
const MAX_RECONNECT_DELAY = Duration.seconds(30)

const encodeRequestFrameToJson = S.encodeUnknownSync(
  S.fromJsonString(RequestFrame),
)

type PendingResponses = HashMap.HashMap<
  string,
  Deferred.Deferred<typeof Response.Type, Error>
>

/**
 * A WebSocket client to the Foldkit Vite plugin's DevTools relay.
 *
 * Sends typed `Request`s and resolves with the matching `Response`. The
 * `sendRequest` Effect fails with `TimeoutException` when no response arrives
 * within the request timeout window, or with `Error` when no relay is
 * connected or the send throws. Either way, no pending entry leaks.
 *
 * The client manages its own connection lifecycle in a background fiber:
 * the initial connect is retried with exponential backoff, and any later
 * disconnect (e.g. when the user restarts the Vite dev server) reconnects
 * via the same loop. The MCP server can stay live across dev-server
 * restarts and even when no dev server has started yet — `sendRequest`
 * returns a clear "not connected" error in that window, and tools should
 * surface it to the agent so the user can start a dev server and retry.
 *
 * Pending response correlators live in a client-owned Ref, not on the
 * socket, so they survive reconnects: in-flight requests time out and
 * future requests succeed once the new socket is open.
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

const reconnectSchedule = Schedule.exponential(INITIAL_RECONNECT_DELAY).pipe(
  Schedule.modifyDelay((_output, delay) =>
    Effect.succeed(Duration.min(delay, MAX_RECONNECT_DELAY)),
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
 * Construct a WebSocket client that maintains its connection to the Foldkit
 * Vite plugin's DevTools relay in the background. The Effect succeeds
 * immediately with a client whose connection state evolves over time. The
 * initial connect is retried with exponential backoff; later disconnects
 * reconnect via the same loop. `sendRequest` fails with a clear "not
 * connected" error while no relay is reachable.
 */
export const connectWebSocketClient = (
  url: string,
): Effect.Effect<WebSocketClient> =>
  Effect.gen(function* () {
    const pendingResponsesRef = yield* Ref.make<PendingResponses>(
      HashMap.empty(),
    )
    const currentSocketRef = yield* Ref.make<Option.Option<WebSocket>>(
      Option.none(),
    )
    const isManuallyClosedRef = yield* Ref.make(false)
    const capturedContext = yield* Effect.context<never>()

    const attachMessageHandler = (socket: WebSocket): void => {
      socket.on('message', raw => {
        Effect.runForkWith(capturedContext)(
          handleIncomingMessage(raw, pendingResponsesRef),
        )
      })
      socket.on('error', error => {
        console.error(`[foldkit-devtools-mcp] socket error: ${error.message}`)
      })
    }

    const openWithBackoff: Effect.Effect<WebSocket> = pipe(
      attemptOpen(url),
      Effect.tapError(error =>
        Console.error(
          `[foldkit-devtools-mcp] connect attempt failed: ${error.message}`,
        ),
      ),
      Effect.retry(reconnectSchedule),
      Effect.orDie,
    )

    const maintainConnection: Effect.Effect<void> = Effect.gen(function* () {
      const socket = yield* openWithBackoff
      yield* Console.error(`[foldkit-devtools-mcp] connected to ${url}`)
      attachMessageHandler(socket)
      yield* Ref.set(currentSocketRef, Option.some(socket))

      yield* waitForClose(socket)

      const isManual = yield* Ref.get(isManuallyClosedRef)
      if (isManual) {
        return
      }

      yield* Ref.set(currentSocketRef, Option.none())
      yield* Console.error(
        '[foldkit-devtools-mcp] connection lost, reconnecting',
      )
      yield* maintainConnection
    })

    const connectionFiber = yield* Effect.forkDetach(maintainConnection)

    const sendRequest = (
      request: typeof Request.Type,
      maybeRuntimeId: Option.Option<string>,
    ): Effect.Effect<typeof Response.Type, Cause.TimeoutError | Error> =>
      Effect.gen(function* () {
        const maybeSocket = yield* Ref.get(currentSocketRef)
        const socket = yield* Option.match(maybeSocket, {
          onNone: () =>
            Effect.fail(
              new Error(
                'Not connected to a Foldkit dev server. Start your Foldkit Vite dev server and retry the tool call.',
              ),
            ),
          onSome: candidate =>
            candidate.readyState === WebSocket.OPEN
              ? Effect.succeed(candidate)
              : Effect.fail(
                  new Error(
                    'Foldkit dev server connection is reconnecting. Retry the tool call in a moment.',
                  ),
                ),
        })

        const id = generateRequestId()
        const deferred = yield* Deferred.make<typeof Response.Type, Error>()
        yield* Ref.update(pendingResponsesRef, HashMap.set(id, deferred))

        const frame: typeof RequestFrame.Type = {
          id,
          maybeConnectionId: maybeRuntimeId,
          request,
        }

        yield* Effect.try({
          try: () => socket.send(encodeRequestFrameToJson(frame)),
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
      const maybeSocket = yield* Ref.get(currentSocketRef)
      yield* Option.match(maybeSocket, {
        onNone: () => Effect.void,
        onSome: socket => Effect.sync(() => socket.close()),
      })
      yield* Fiber.interrupt(connectionFiber)
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
  return Exit.match(decoded, {
    onFailure: error =>
      Effect.sync(() =>
        console.error('[foldkit-devtools-mcp] failed to decode frame', error),
      ),
    onSuccess: responseFrame =>
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

import { Duration, Effect } from 'effect'
import { Socket } from 'effect/socket'

export const openWebSocketConnection = (
  makeWebSocket: typeof Socket.WebSocketConstructor.Service,
  url: string,
  openTimeout: Duration.Input,
) =>
  Effect.gen(function* () {
    const socket = yield* Socket.fromWebSocket(
      Effect.acquireRelease(
        Effect.sync(() => makeWebSocket(url)),
        socket => Effect.sync(() => socket.close()),
      ),
      { openTimeout },
    )

    const reader = yield* socket.reader
    const writer = yield* socket.writer

    return { reader, writer }
  })
export type WebSocketConnection = Effect.Success<
  ReturnType<typeof openWebSocketConnection>
>

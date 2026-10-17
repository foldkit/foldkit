import { Duration, Effect, Match, Option, Schema } from 'effect'
import { Socket } from 'effect/socket'

import { ChatSocket } from './chatSocket'
import { Application } from './definition'
import { Message } from './message'

const WS_URL = 'wss://ws.postman-echo.com/raw'
const CONNECTION_TIMEOUT_MS = 5000

export const managedResources = Application.managedResources(entry => ({
  chatSocket: entry('ManageChatSocket', Schema.Option(Schema.Null), {
    resource: ChatSocket,
    modelToMaybeRequirements: model =>
      Match.value(model.connection).pipe(
        Match.tag('Connecting', () => Option.some(null)),
        Match.tag('Connected', () => Option.some(null)),
        Match.orElse(() => Option.none()),
      ),
    onAcquired: () => Message.ConnectedChatSocket(),
    onReleased: () => Message.ReleasedChatSocket(),
    onAcquireError: error =>
      Message.FailedConnectChatSocket({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    handler: function* () {
      const makeWebSocket = yield* Socket.WebSocketConstructor

      return {
        acquire: () =>
          Effect.gen(function* () {
            const socket = yield* Effect.acquireRelease(
              Effect.sync(() => makeWebSocket(WS_URL)),
              socket =>
                Effect.sync(() => {
                  socket.close()
                }),
            )

            yield* Effect.callback<void, Error>(resume => {
              const removeListeners = () => {
                socket.removeEventListener('open', handleOpen)
                socket.removeEventListener('error', handleError)
              }
              const handleOpen = () => {
                removeListeners()
                resume(Effect.void)
              }
              const handleError = () => {
                removeListeners()
                resume(Effect.fail(new Error('Failed to connect to WebSocket')))
              }

              socket.addEventListener('open', handleOpen)
              socket.addEventListener('error', handleError)

              return Effect.sync(removeListeners)
            }).pipe(
              Effect.timeout(Duration.millis(CONNECTION_TIMEOUT_MS)),
              Effect.catchTag('TimeoutError', () =>
                Effect.fail(new Error('Connection timeout')),
              ),
            )

            return socket
          }),
        release: () => Effect.void,
      }
    },
  }),
}))

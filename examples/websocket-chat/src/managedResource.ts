import { Duration, Effect, Match, Option, Schema } from 'effect'
import { Socket } from 'effect/socket'

import { makeManagedResources } from './block'
import { ChatSocket } from './chatSocket'
import { Message } from './message'
import { openWebSocketConnection } from './webSocketConnection'

const WS_URL = 'wss://ws.postman-echo.com/raw'
const CONNECTION_TIMEOUT_MS = 5000

export const managedResources = makeManagedResources(entry => ({
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
          openWebSocketConnection(
            makeWebSocket,
            WS_URL,
            Duration.millis(CONNECTION_TIMEOUT_MS),
          ),
        release: () => Effect.void,
      }
    },
  }),
}))

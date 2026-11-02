import { Effect, Match, Option, Schema } from 'effect'
import { Socket } from 'effect/socket'

import { ChatSocket } from './chatSocket'
import { ChatRoomDefinition } from './definition'
import { Message } from './message'
import { openChatSocket } from './socket'

export const managedResources = ChatRoomDefinition.makeManagedResources(
  entry => ({
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
          acquire: () => openChatSocket(makeWebSocket),
          release: () => Effect.void,
        }
      },
    }),
  }),
)

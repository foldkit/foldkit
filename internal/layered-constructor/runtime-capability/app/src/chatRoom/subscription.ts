import { Effect, Stream } from 'effect'

import { ChatSocket } from './chatSocket'
import { ChatRoomDefinition } from './definition'
import { Message } from './message'
import { ConnectionState } from './model'
import { streamChatSocketMessages } from './socket'

export const subscriptions = ChatRoomDefinition.makeSubscriptions(entry => ({
  chatSocketMessages: entry('ChatSocketMessages', {
    messages: [
      Message.ReceivedMessage,
      Message.DisconnectedChatSocket,
      Message.FailedChatSocket,
    ],
    when: model => ConnectionState.guards.Connected(model.connection),
    handler: function* () {
      return () =>
        Stream.unwrap(
          ChatSocket.get.pipe(
            Effect.map(streamChatSocketMessages),
            Effect.catchTag('ResourceNotAvailable', () =>
              Effect.succeed(Stream.empty),
            ),
          ),
        )
    },
  }),
}))

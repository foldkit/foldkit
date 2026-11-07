import { Effect, Predicate, Schema, Stream } from 'effect'

import { makeSubscriptions } from './block'
import { ChatSocket } from './chatSocket'
import { Message } from './message'
import type { WebSocketConnection } from './webSocketConnection'

const streamChatSocketMessages = (connection: WebSocketConnection) =>
  Stream.fromPull(Effect.succeed(connection.reader.pull)).pipe(
    Stream.filter(Predicate.isString),
    Stream.map(text => Message.ReceivedMessage({ text })),
    Stream.catch(error =>
      Stream.succeed(
        error.reason._tag === 'SocketCloseError'
          ? Message.DisconnectedChatSocket()
          : Message.FailedChatSocket({ error: 'Connection error' }),
      ),
    ),
  )

export const subscriptions = makeSubscriptions(entry => ({
  chatSocketMessages: entry(
    'ChatSocketMessages',
    { isConnected: Schema.Boolean },
    {
      messages: [
        Message.ReceivedMessage,
        Message.DisconnectedChatSocket,
        Message.FailedChatSocket,
      ],
      modelToDependencies: model => ({
        isConnected: model.connection._tag === 'Connected',
      }),
      handler: function* () {
        return ({ isConnected }) =>
          Stream.when(
            Stream.unwrap(
              ChatSocket.get.pipe(
                Effect.map(streamChatSocketMessages),
                Effect.catchTag('ResourceNotAvailable', () =>
                  Effect.succeed(Stream.empty),
                ),
              ),
            ),
            Effect.sync(() => isConnected),
          )
      },
    },
  ),
}))

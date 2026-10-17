import { Effect, Predicate, Queue, Schema, Stream } from 'effect'
import { Socket } from 'effect/socket'

import { ChatSocket } from './chatSocket'
import { Application } from './definition'
import { Message } from './message'

const streamChatSocketMessages = (socket: Socket.WebSocketLike) =>
  Stream.callback<
    | typeof Message.ReceivedMessage.Type
    | typeof Message.DisconnectedChatSocket.Type
    | typeof Message.FailedChatSocket.Type
  >(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const handleMessage = (event: Socket.WebSocketEvent) => {
          if (Predicate.isString(event.data)) {
            Queue.offerUnsafe(
              queue,
              Message.ReceivedMessage({ text: event.data }),
            )
          }
        }
        const handleClose = () => {
          Queue.offerUnsafe(queue, Message.DisconnectedChatSocket())
          Queue.endUnsafe(queue)
        }
        const handleError = () => {
          Queue.offerUnsafe(
            queue,
            Message.FailedChatSocket({ error: 'Connection error' }),
          )
          Queue.endUnsafe(queue)
        }

        socket.addEventListener('message', handleMessage)
        socket.addEventListener('close', handleClose)
        socket.addEventListener('error', handleError)

        return { handleMessage, handleClose, handleError }
      }),
      ({ handleMessage, handleClose, handleError }) =>
        Effect.sync(() => {
          socket.removeEventListener('message', handleMessage)
          socket.removeEventListener('close', handleClose)
          socket.removeEventListener('error', handleError)
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

export const subscriptions = Application.subscriptions(entry => ({
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

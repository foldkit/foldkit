import { Duration, Effect, Predicate, Queue, Stream } from 'effect'
import type { Socket } from 'effect/socket'

import {
  type DisconnectedChatSocket,
  type FailedChatSocket,
  Message,
  type ReceivedMessage,
} from './message'

const WS_URL = 'wss://ws.postman-echo.com/raw'
const CONNECTION_TIMEOUT_MS = 5000

export const openChatSocket = (
  makeWebSocket: (url: string) => Socket.WebSocketLike,
) =>
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
  })

export const streamChatSocketMessages = (socket: Socket.WebSocketLike) =>
  Stream.callback<ReceivedMessage | DisconnectedChatSocket | FailedChatSocket>(
    queue =>
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

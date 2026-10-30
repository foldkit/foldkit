import { Duration, Effect, Predicate, Queue, Schema, Stream } from 'effect'
import { Socket } from 'effect/socket'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

const WS_URL = 'wss://ws.postman-echo.com/raw'
const CONNECTION_TIMEOUT_MS = 5000

export const SocketState = defineTaggedUnion({
  Opening: {},
  Open: {},
})
export type SocketState = typeof SocketState.Type

const Message = defineMessageUnion({
  SucceededWaitForOpen: {},
  FailedWaitForOpen: { error: Schema.String },
  ReceivedSocketMessage: { text: Schema.String },
  ClosedSocket: {},
  ErroredSocket: { error: Schema.String },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  Connected: {},
  FailedConnect: { error: Schema.String },
  ReceivedMessage: { text: Schema.String },
  Disconnected: {},
  Failed: { error: Schema.String },
})

export const WaitForOpen = Command.define('WaitForOpen', {
  messages: [Message.SucceededWaitForOpen, Message.FailedWaitForOpen],
})

export class ChatSocket extends Block<
  ChatSocket,
  void,
  void,
  Socket.WebSocketLike
>()('ChatSocket', {
  Model: SocketState,
  Message,
  OutMessage,
  Command: [WaitForOpen],
}) {}

const waitForOpen = (socket: Socket.WebSocketLike) =>
  Effect.callback<void, Error>(resume => {
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
    Effect.as(Message.SucceededWaitForOpen()),
    Effect.catch(error =>
      Effect.succeed(Message.FailedWaitForOpen({ error: error.message })),
    ),
  )

const streamSocketEvents = (socket: Socket.WebSocketLike) =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const handleMessage = (event: Socket.WebSocketEvent) => {
          if (Predicate.isString(event.data)) {
            Queue.offerUnsafe(
              queue,
              Message.ReceivedSocketMessage({ text: event.data }),
            )
          }
        }
        const handleClose = () => {
          Queue.offerUnsafe(queue, Message.ClosedSocket())
          Queue.endUnsafe(queue)
        }
        const handleError = () => {
          Queue.offerUnsafe(
            queue,
            Message.ErroredSocket({ error: 'Connection error' }),
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

export const ChatSocketLive = ChatSocket.make(
  Effect.fn(function* () {
    const makeWebSocket = yield* Socket.WebSocketConstructor

    const socket = yield* Effect.acquireRelease(
      Effect.sync(() => makeWebSocket(WS_URL)),
      socket =>
        Effect.sync(() => {
          socket.close()
        }),
    )

    return {
      model: SocketState.Opening(),

      start: [WaitForOpen()],

      update: {
        SucceededWaitForOpen: () => ({
          model: SocketState.Open(),
          outMessage: ChatSocket.OutMessage.Connected(),
        }),
        FailedWaitForOpen: (model, { error }) => ({
          model,
          outMessage: ChatSocket.OutMessage.FailedConnect({ error }),
        }),
        ReceivedSocketMessage: (model, { text }) => ({
          model,
          outMessage: ChatSocket.OutMessage.ReceivedMessage({ text }),
        }),
        ClosedSocket: model => ({
          model,
          outMessage: ChatSocket.OutMessage.Disconnected(),
        }),
        ErroredSocket: (model, { error }) => ({
          model,
          outMessage: ChatSocket.OutMessage.Failed({ error }),
        }),
      },

      commands: {
        WaitForOpen: () => waitForOpen(socket),
      },

      subscriptions: {
        socketEvents: {
          dependencies: model => model._tag === 'Open',
          stream: (isOpen: boolean) =>
            isOpen ? streamSocketEvents(socket) : Stream.empty,
        },
      },

      expose: socket,
    }
  }),
)

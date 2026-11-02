import { Effect, RcMap, Schema, Stream } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ReceivedData: { data: Schema.String },
  RequestedSend: { data: Schema.String },
  SucceededSendData: {},
  FailedSendData: { reason: Schema.String },
})

export const SendData = Command.define('SendData', {
  args: { roomId: Schema.String, data: Schema.String },
  messages: [Message.SucceededSendData, Message.FailedSendData],
})

export class Socket extends Block<Socket, Readonly<{ roomId: string }>>()(
  'Socket',
  {
    Model: Schema.Struct({ roomId: Schema.String }),
    Message,
    OutMessage: defineMessageUnion({
      Received: { data: Schema.String },
      FailedToSend: { reason: Schema.String },
    }),
    Command: [SendData],
  },
) {}

export const SocketLive = Socket.toLayer(
  Effect.gen(function* () {
    const connections = yield* RcMap.make({
      lookup: (roomId: string) =>
        Effect.acquireRelease(
          Effect.sync(
            () => new WebSocket(`wss://chat.example.com/rooms/${roomId}`),
          ),
          socket => Effect.sync(() => socket.close()),
        ),
    })

    return {
      init: ({ roomId }) => ({ roomId }),

      subscriptions: {
        receivedData: {
          dependencies: model => model.roomId,
          stream: (roomId: string) =>
            Stream.unwrap(
              RcMap.get(connections, roomId).pipe(
                Effect.map(socket =>
                  Stream.fromEventListener<MessageEvent>(
                    socket,
                    'message',
                  ).pipe(
                    Stream.map(event =>
                      Message.ReceivedData({
                        data: globalThis.String(event.data),
                      }),
                    ),
                  ),
                ),
              ),
            ),
        },
      },

      update: {
        ReceivedData: (model, { data }) => ({
          model,
          outMessage: Socket.OutMessage.Received({ data }),
        }),
        RequestedSend: (model, { data }) => ({
          model,
          commands: [SendData({ roomId: model.roomId, data })],
        }),
        SucceededSendData: model => ({ model }),
        FailedSendData: (model, { reason }) => ({
          model,
          outMessage: Socket.OutMessage.FailedToSend({ reason }),
        }),
      },

      commands: {
        SendData: ({ roomId, data }) =>
          RcMap.get(connections, roomId).pipe(
            Effect.flatMap(socket => Effect.try(() => socket.send(data))),
            Effect.scoped,
            Effect.as(Message.SucceededSendData()),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedSendData({ reason: globalThis.String(error) }),
              ),
            ),
          ),
      },
    }
  }),
)

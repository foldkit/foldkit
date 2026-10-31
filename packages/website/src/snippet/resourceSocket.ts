import { Effect, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export type SocketArgs = Readonly<{ url: string }>

export type SocketHandle = Readonly<{
  send: (data: string) => Effect.Effect<void>
}>

export class Socket extends Block<Socket, SocketArgs, void, SocketHandle>()(
  'Socket',
  {
    Message: defineMessageUnion({ Received: { data: Schema.String } }),
    OutMessage: defineMessageUnion({ Received: { data: Schema.String } }),
  },
) {}

export const SocketLive = Socket.make(
  Effect.fn(function* (_id, { url }) {
    const socket = yield* Effect.acquireRelease(
      Effect.sync(() => new WebSocket(url)),
      socket => Effect.sync(() => socket.close()),
    )

    return {
      stream: Stream.fromEventListener<MessageEvent>(socket, 'message').pipe(
        Stream.map(event =>
          Socket.Message.Received({ data: globalThis.String(event.data) }),
        ),
      ),

      update: {
        Received: (model, { data }) => ({
          model,
          outMessage: Socket.OutMessage.Received({ data }),
        }),
      },

      expose: {
        send: data => Effect.sync(() => socket.send(data)),
      },
    }
  }),
)

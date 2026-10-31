// ✅ Good: a ChatSocket instance in the Model owns the WebSocket.

import { Effect, Option, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

type RoomArgs = Readonly<{ roomId: string }>

type ChatSocketHandle = Readonly<{
  send: (text: string) => Effect.Effect<void>
}>

export class ChatSocket extends Block<
  ChatSocket,
  RoomArgs,
  void,
  ChatSocketHandle
>()('ChatSocket', {}) {}

export const ChatSocketLive = ChatSocket.make(
  Effect.fn(function* (_id, { roomId }) {
    const socket = yield* Effect.acquireRelease(
      Effect.sync(() => new WebSocket(`/rooms/${roomId}`)),
      socket => Effect.sync(() => socket.close()),
    )

    return {
      expose: { send: text => Effect.sync(() => socket.send(text)) },
    }
  }),
)

const Message = defineMessageUnion({
  ClickedJoin: {},
  ClickedLeave: {},
  SubmittedChatMessage: { text: Schema.String },
  SucceededSendChatMessage: {},
  FailedSendChatMessage: {},
})

const SendChatMessage = Command.define('SendChatMessage', {
  args: { text: Schema.String },
  messages: [Message.SucceededSendChatMessage, Message.FailedSendChatMessage],
})

export class ChatRoom extends Block<ChatRoom, RoomArgs>()('ChatRoom', {
  Model: Schema.Struct({ maybeSocket: Schema.Option(ChatSocket) }),
  Message,
  Command: [SendChatMessage],
}) {}

export const ChatRoomLive = ChatRoom.make(
  Effect.fn(function* (_id, { roomId }) {
    const socket = yield* new ChatSocket('socket', { roomId })

    return {
      model: { maybeSocket: Option.none() },

      update: {
        ClickedJoin: model => ({
          model: modifyFields(model, {
            maybeSocket: () => Option.some(socket),
          }),
        }),
        ClickedLeave: model => ({
          model: modifyFields(model, { maybeSocket: () => Option.none() }),
        }),
        SubmittedChatMessage: (model, { text }) => ({
          model,
          commands: [SendChatMessage({ text })],
        }),
        SucceededSendChatMessage: model => ({ model }),
        FailedSendChatMessage: model => ({ model }),
      },

      commands: {
        SendChatMessage: ({ text }) =>
          socket.use.pipe(
            Effect.flatMap(({ send }) => send(text)),
            Effect.as(Message.SucceededSendChatMessage()),
            Effect.catchTag('NotConnected', () =>
              Effect.succeed(Message.FailedSendChatMessage()),
            ),
          ),
      },
    }
  }),
)

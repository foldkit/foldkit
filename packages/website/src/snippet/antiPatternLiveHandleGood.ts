// ✅ Good: a Subscription holds the WebSocket while the visitor is in the room.

import { Effect, RcMap, Schema, Stream } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedJoin: {},
  ClickedLeave: {},
  SubmittedChatMessage: { text: Schema.String },
  SucceededSendChatMessage: {},
  FailedSendChatMessage: {},
})

const SendChatMessage = Command.define('SendChatMessage', {
  args: { roomId: Schema.String, text: Schema.String },
  messages: [Message.SucceededSendChatMessage, Message.FailedSendChatMessage],
})

export class ChatRoom extends Block<ChatRoom, Readonly<{ roomId: string }>>()(
  'ChatRoom',
  {
    Model: Schema.Struct({ roomId: Schema.String, isJoined: Schema.Boolean }),
    Message,
    Command: [SendChatMessage],
  },
) {}

export const ChatRoomLive = ChatRoom.toLayer(
  Effect.gen(function* () {
    const sockets = yield* RcMap.make({
      lookup: (roomId: string) =>
        Effect.acquireRelease(
          Effect.sync(() => new WebSocket(`/rooms/${roomId}`)),
          socket => Effect.sync(() => socket.close()),
        ),
    })

    return {
      init: ({ roomId }) => ({ roomId, isJoined: false }),

      update: {
        ClickedJoin: model => ({
          model: modifyFields(model, { isJoined: () => true }),
        }),
        ClickedLeave: model => ({
          model: modifyFields(model, { isJoined: () => false }),
        }),
        SubmittedChatMessage: (model, { text }) => ({
          model,
          commands: [SendChatMessage({ roomId: model.roomId, text })],
        }),
        SucceededSendChatMessage: model => ({ model }),
        FailedSendChatMessage: model => ({ model }),
      },

      commands: {
        SendChatMessage: ({ roomId, text }) =>
          RcMap.getOption(sockets, roomId).pipe(
            Effect.flatMap(Effect.fromOption),
            Effect.flatMap(socket => Effect.sync(() => socket.send(text))),
            Effect.as(Message.SucceededSendChatMessage()),
            Effect.catch(() => Effect.succeed(Message.FailedSendChatMessage())),
            Effect.scoped,
          ),
      },

      subscriptions: {
        socket: {
          dependencies: model => ({
            roomId: model.roomId,
            isJoined: model.isJoined,
          }),
          stream: ({
            roomId,
            isJoined,
          }: Readonly<{ roomId: string; isJoined: boolean }>) =>
            isJoined
              ? Stream.fromEffect(RcMap.get(sockets, roomId)).pipe(
                  Stream.drain,
                  Stream.concat(Stream.never),
                  Stream.scoped,
                )
              : Stream.empty,
        },
      },
    }
  }),
)

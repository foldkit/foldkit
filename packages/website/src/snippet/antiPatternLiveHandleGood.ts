// ✅ Good: Model state controls the WebSocket's lifetime.

import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

const Chat = Block.define('Chat', { Model, Message })
const ChatSocket = Chat.resource<WebSocket>()('ChatSocket')

const RoomRequirements = Schema.Struct({ roomId: Schema.String })

const managedResources = Chat.managedResources(entry => ({
  chatSocket: entry('ManageChatSocket', Schema.Option(RoomRequirements), {
    resource: ChatSocket,
    modelToMaybeRequirements: model => model.maybeRoomRequirements,
    onAcquired: () => Message.AcquiredChatSocket(),
    onReleased: () => Message.ReleasedChatSocket(),
    onAcquireError: error =>
      Message.FailedAcquireChatSocket({ error: globalThis.String(error) }),
    handler: function* () {
      return {
        acquire: ({ roomId }) =>
          Effect.try(() => new WebSocket(`/rooms/${roomId}`)),
        release: socket => Effect.sync(() => socket.close()),
      }
    },
  }),
}))

const SendChatMessage = Chat.command('SendChatMessage', {
  args: { text: Schema.String },
  messages: [Message.SucceededSendChatMessage, Message.FailedSendChatMessage],
  handler: function* () {
    return ({ text }) =>
      ChatSocket.get.pipe(
        Effect.flatMap(socket => Effect.try(() => socket.send(text))),
        Effect.match({
          onFailure: error =>
            Message.FailedSendChatMessage({ error: globalThis.String(error) }),
          onSuccess: () => Message.SucceededSendChatMessage(),
        }),
      )
  },
})

export const EffectsLayer = Layer.mergeAll(
  managedResources.chatSocket.layer,
  SendChatMessage.layer,
)

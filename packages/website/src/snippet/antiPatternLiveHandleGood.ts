// ✅ Good: Model state controls the WebSocket's lifetime.

import { Effect, Schema } from 'effect'
import { Command, ManagedResource } from 'foldkit'

const ChatSocket = ManagedResource.tag<WebSocket>()('ChatSocket')
const RoomRequirements = Schema.Struct({ roomId: Schema.String })

const managedResources = ManagedResource.make<Model, Message>()(entry => ({
  chatSocket: entry(Schema.Option(RoomRequirements), {
    resource: ChatSocket,
    modelToMaybeRequirements: model => model.maybeRoomRequirements,
    acquire: ({ roomId }) =>
      Effect.try(() => new WebSocket(`/rooms/${roomId}`)),
    release: socket => Effect.sync(() => socket.close()),
    onAcquired: () => Message.AcquiredChatSocket(),
    onReleased: () => Message.ReleasedChatSocket(),
    onAcquireError: error =>
      Message.FailedAcquireChatSocket({ error: globalThis.String(error) }),
  }),
}))

const SendChatMessage = Command.define('SendChatMessage', {
  args: { text: Schema.String },
  messages: [Message.CompletedSendChatMessage, Message.FailedSendChatMessage],
  execute: ({ text }) =>
    ChatSocket.get.pipe(
      Effect.flatMap(socket => Effect.try(() => socket.send(text))),
      Effect.match({
        onFailure: error =>
          Message.FailedSendChatMessage({
            error: globalThis.String(error),
          }),
        onSuccess: () => Message.CompletedSendChatMessage(),
      }),
    ),
})

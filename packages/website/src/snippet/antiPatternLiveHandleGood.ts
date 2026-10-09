// ✅ Good: Model state controls the WebSocket's lifetime.

import { Effect, Layer, Schema } from 'effect'
import { Command, ManagedResource } from 'foldkit'

import { Message } from './message'

const ChatSocket = ManagedResource.tag<WebSocket>()('ChatSocket')
const RoomRequirements = Schema.Struct({ roomId: Schema.String })

const managedResources = ManagedResource.make<Model, Message>()(entry => ({
  chatSocket: entry('ManageChatSocket', Schema.Option(RoomRequirements), {
    resource: ChatSocket,
    modelToMaybeRequirements: model => model.maybeRoomRequirements,
    onAcquired: () => Message.AcquiredChatSocket(),
    onReleased: () => Message.ReleasedChatSocket(),
    onAcquireError: error =>
      Message.FailedAcquireChatSocket({ error: globalThis.String(error) }),
  }),
}))

const ManageChatSocketLayer = managedResources.chatSocket.toLayer({
  acquire: ({ roomId }) => Effect.try(() => new WebSocket(`/rooms/${roomId}`)),
  release: socket => Effect.sync(() => socket.close()),
})

const SendChatMessage = Command.define('SendChatMessage', {
  args: { text: Schema.String },
  messages: [Message.SucceededSendChatMessage, Message.FailedSendChatMessage],
})

const SendChatMessageLayer = SendChatMessage.toLayer(({ text }) =>
  ChatSocket.get.pipe(
    Effect.flatMap(socket => Effect.try(() => socket.send(text))),
    Effect.match({
      onFailure: error =>
        Message.FailedSendChatMessage({ error: globalThis.String(error) }),
      onSuccess: () => Message.SucceededSendChatMessage(),
    }),
  ),
)

const layer = Layer.mergeAll(ManageChatSocketLayer, SendChatMessageLayer)

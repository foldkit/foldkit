// Before: a ManagedResource registry acquired from Model requirements.
import { Effect, Option, Schema } from 'effect'

import { ChatDefinition, ChatSocket } from './definition'
import { Message } from './message'

const CHAT_URL = 'wss://chat.example.com'

export const managedResources = ChatDefinition.makeManagedResources(entry => ({
  chatSocket: entry('ManageChatSocket', Schema.Option(Schema.Null), {
    resource: ChatSocket,
    modelToMaybeRequirements: model =>
      model.isConnected ? Option.some(null) : Option.none(),
    onAcquired: () => Message.AcquiredChatSocket(),
    onReleased: () => Message.ReleasedChatSocket(),
    onAcquireError: error =>
      Message.FailedAcquireChatSocket({ error: globalThis.String(error) }),
    handler: function* () {
      return {
        acquire: () => Effect.sync(() => new WebSocket(CHAT_URL)),
        release: socket => Effect.sync(() => socket.close()),
      }
    },
  }),
}))

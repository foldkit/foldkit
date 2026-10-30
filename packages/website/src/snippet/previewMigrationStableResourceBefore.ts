// Stable before: a ManagedResource entry acquires the socket from Model state.
import { Effect, Option, Schema } from 'effect'
import { ManagedResource } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

export const ChatSocket = ManagedResource.tag<WebSocket>()('ChatSocket')

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    chatSocket: entry(Schema.Option(Schema.Null), {
      resource: ChatSocket,
      modelToMaybeRequirements: model =>
        model.isConnected ? Option.some(null) : Option.none(),
      acquire: () => Effect.sync(() => new WebSocket(CHAT_URL)),
      release: socket => Effect.sync(() => socket.close()),
      onAcquired: () => Message.AcquiredChatSocket(),
      onReleased: () => Message.ReleasedChatSocket(),
      onAcquireError: error =>
        Message.FailedAcquireChatSocket({ error: globalThis.String(error) }),
    }),
  }),
)

const CHAT_URL = 'wss://chat.example.com'

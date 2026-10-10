// page/call/managedResource.ts
import { Effect, Layer, Option, Schema } from 'effect'
import { ManagedResource } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'
import * as VideoCall from './videoCall'

const SIGNALING_URL = 'wss://example.com/call/signaling'

const SignalingSocket = ManagedResource.tag<WebSocket>()('SignalingSocket')

const videoCallManagedResources = ManagedResource.lift(
  VideoCall.managedResources,
)<Model, Message>({
  read: model => model.videoCall,
  toParentMessage: message => Message.GotVideoCallMessage({ message }),
})

const localManagedResources = ManagedResource.make<Model, Message>()(entry => ({
  signalingSocket: entry('ManageSignalingSocket', Schema.Option(Schema.Null), {
    resource: SignalingSocket,
    modelToMaybeRequirements: model => Option.as(model.videoCall, null),
    onAcquired: () => Message.OpenedSignaling(),
    onReleased: () => Message.ClosedSignaling(),
    onAcquireError: error => Message.FailedSignaling({ error: String(error) }),
    handler: function* () {
      return {
        acquire: () => Effect.try(() => new WebSocket(SIGNALING_URL)),
        release: socket => Effect.sync(() => socket.close()),
      }
    },
  }),
}))

export const managedResources = ManagedResource.aggregate(
  videoCallManagedResources,
  localManagedResources,
)

export const EffectsLayer = Layer.mergeAll(
  VideoCall.EffectsLayer,
  localManagedResources.signalingSocket.layer,
)

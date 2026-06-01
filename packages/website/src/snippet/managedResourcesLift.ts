// page/call/managedResource.ts
import { Effect, Option, Schema as S } from 'effect'
import { ManagedResource } from 'foldkit'

import {
  ClosedSignaling,
  FailedSignaling,
  GotVideoCallMessage,
  type Message,
  OpenedSignaling,
} from './message'
import type { Model } from './model'
import * as VideoCall from './videoCall'

const SIGNALING_URL = 'wss://example.com/call/signaling'

const SignalingSocket = ManagedResource.tag<WebSocket>()('SignalingSocket')

const videoCallManagedResources = ManagedResource.lift(
  VideoCall.managedResources,
)<Model, Message>({
  toChildModel: model => model.videoCall,
  toParentMessage: message => GotVideoCallMessage({ message }),
})

const localManagedResources = ManagedResource.make<Model, Message>()(entry => ({
  signalingSocket: entry(S.Option(S.Null), {
    resource: SignalingSocket,
    modelToMaybeRequirements: model => Option.as(model.videoCall, null),
    acquire: () => Effect.try(() => new WebSocket(SIGNALING_URL)),
    release: socket => Effect.sync(() => socket.close()),
    onAcquired: () => OpenedSignaling(),
    onReleased: () => ClosedSignaling(),
    onAcquireError: error => FailedSignaling({ error: String(error) }),
  }),
}))

export const managedResources = ManagedResource.aggregate<Model, Message>()(
  videoCallManagedResources,
  localManagedResources,
)

import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'

import { init } from './init'
import { Message } from './message'
import { Model } from './model'
import { update } from './update'
import * as VideoCall from './videoCall'

const SIGNALING_URL = 'wss://example.com/call/signaling'

const Call = Block.define('Call', { Model, Message })
const SignalingSocket = Call.resource<WebSocket>()('SignalingSocket')

const VideoCallBinding = Call.bindChild(VideoCall.block, {
  field: 'videoCall',
  parentMessage: Message.GotVideoCallMessage,
})

const CallComposition = Call.makeComposition({
  childBindings: [VideoCallBinding],
})

export const managedResources = Call.managedResources(entry => ({
  signalingSocket: entry('ManageSignalingSocket', Schema.Option(Schema.Null), {
    resource: SignalingSocket,
    modelToMaybeRequirements: model => Option.as(model.videoCall, null),
    onAcquired: () => Message.OpenedSignaling(),
    onReleased: () => Message.ClosedSignaling(),
    onAcquireError: error =>
      Message.FailedSignaling({ error: globalThis.String(error) }),
    handler: function* () {
      return {
        acquire: () => Effect.try(() => new WebSocket(SIGNALING_URL)),
        release: socket => Effect.sync(() => socket.close()),
      }
    },
  }),
}))

export const block = CallComposition.makeBlock({
  init,
  update,
  managedResources,
  EffectsLayer: managedResources.signalingSocket.layer,
})

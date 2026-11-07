import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'

import { init } from './init'
import { Message } from './message'
import { Model } from './model'
import { update } from './update'
import * as VideoCall from './videoCall'

const SIGNALING_URL = 'wss://example.com/call/signaling'

export const CallKey = Symbol('Call')
export const CallBlock = Block.make('Call', {
  key: CallKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const {
  makeResource,
  makeRequiredFieldBinding,
  makeComposition,
  makeManagedResources,
} = CallBlock
const SignalingSocket = makeResource<WebSocket>()('SignalingSocket')

const VideoCallBinding = makeRequiredFieldBinding(VideoCall.VideoCallBlock, {
  field: 'videoCall',
})

const CallComposition = makeComposition({
  bindings: [VideoCallBinding],
})

export const managedResources = makeManagedResources(entry => ({
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

export const layer = CallBlock.makeLayer({
  init,
  update,
  managedResources,
  EffectsLayer: managedResources.signalingSocket.layer,
}).pipe(Layer.provide(VideoCall.layer))

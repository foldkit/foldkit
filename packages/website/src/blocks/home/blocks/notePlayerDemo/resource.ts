import { Effect, Option, Schema } from 'effect'

import { Message, makeManagedResources, makeResource } from './block'

export const AudioContextResource = makeResource<AudioContext>()('AudioContext')

export const managedResources = makeManagedResources(entry => ({
  audioContext: entry('ManageAudioContext', Schema.Option(Schema.Null), {
    resource: AudioContextResource,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: () => Message.SucceededAcquireAudioContext(),
    onReleased: () => Message.ReleasedAudioContext(),
    onAcquireError: () => Message.FailedAcquireAudioContext(),
    handler: function* () {
      return {
        acquire: () =>
          Effect.try({
            try: () => new AudioContext(),
            catch: () =>
              new Error('The Web Audio API is unavailable in this browser.'),
          }),
        release: audioContext =>
          Effect.promise(() => audioContext.close().catch(() => undefined)),
      }
    },
  }),
}))

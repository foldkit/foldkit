import { Effect } from 'effect'
import { Runtime } from 'foldkit'
import { Command } from 'foldkit/command'

// 1. Define a service using Effect.Service
class AudioContextService extends Effect.Service<AudioContextService>()(
  'AudioContextService',
  { sync: () => new AudioContext() },
) {}

// 2. Commands yield the service — provided via the resources layer
const playNote = (
  frequency: number,
  duration: number,
): Command<typeof PlayedNote, never, AudioContextService> =>
  Effect.gen(function* () {
    const audioContext = yield* AudioContextService
    const oscillator = audioContext.createOscillator()
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
    oscillator.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + duration)
    return PlayedNote()
  })

// 3. Pass the service's default layer to makeElement
const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  resources: AudioContextService.Default,
})

import { Effect } from 'effect'
import { Command, Runtime } from 'foldkit'

// 1. Define a service using Effect.Service
class AudioContextService extends Effect.Service<AudioContextService>()(
  'AudioContextService',
  { sync: () => new AudioContext() },
) {}

// 2. Commands yield the service — provided via the resources layer
const playNote = (
  frequency: number,
  duration: number,
): Command.Command<typeof PlayedNote, never, AudioContextService> =>
  Effect.gen(function* () {
    const audioContext = yield* AudioContextService
    const oscillator = audioContext.createOscillator()
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
    oscillator.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + duration)
    return PlayedNote()
  }).pipe(Command.make('PlayNote'))

// 3. Pass the service's default layer to makeElement
const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  resources: AudioContextService.Default,
})

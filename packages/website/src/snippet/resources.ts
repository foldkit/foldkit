import { Context, Effect, Layer, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'

class AudioContextService extends Context.Service<
  AudioContextService,
  AudioContext
>()('AudioContextService') {
  static readonly Default = Layer.sync(this, () => new AudioContext())
}

const PlayNote = Command.define(
  'PlayNote',
  { frequency: S.Number, duration: S.Number },
  CompletedPlayNote,
)(({ frequency, duration }) =>
  Effect.gen(function* () {
    const audioContext = yield* AudioContextService
    const oscillator = audioContext.createOscillator()
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
    oscillator.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + duration)
    return CompletedPlayNote()
  }),
)

// 3. Pass the service's default layer to makeProgram
const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  resources: AudioContextService.Default,
})

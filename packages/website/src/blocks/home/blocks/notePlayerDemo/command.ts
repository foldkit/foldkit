import { Duration, Effect, Schema } from 'effect'

import {
  type CompletedPlayNote,
  Message,
  Note,
  NoteDuration,
  makeCommand,
} from './block'
import {
  DURATION_MILLISECONDS,
  NOTE_FREQUENCIES,
  PHASE_DURATION,
} from './noteInput'
import { AudioContextResource } from './resource'

const GAIN_ATTACK_TIME = 0.01
const GAIN_RELEASE_TIME = 0.02
const GAIN_NEAR_SILENT = 0.001

export const DelayAdvanceNotePlayerPhase = makeCommand(
  'DelayAdvanceNotePlayerPhase',
  {
    args: { generation: Schema.Number },
    messages: [Message.CompletedDelayAdvanceNotePlayerPhase],
    handler: function* () {
      return ({ generation }) =>
        Effect.sleep(PHASE_DURATION).pipe(
          Effect.as(
            Message.CompletedDelayAdvanceNotePlayerPhase({ generation }),
          ),
        )
    },
  },
)

export const PlayNote = makeCommand('PlayNote', {
  args: { note: Note, duration: NoteDuration, noteIndex: Schema.Number },
  messages: [Message.CompletedPlayNote],
  handler: function* () {
    return ({ note, duration, noteIndex }) =>
      Effect.gen(function* () {
        const audioContext = yield* AudioContextResource.get
        yield* Effect.promise(() =>
          audioContext.resume().catch(() => undefined),
        )

        return yield* Effect.callback<CompletedPlayNote>(resume => {
          if (audioContext.state === 'closed') {
            resume(Effect.succeed(Message.CompletedPlayNote({ noteIndex })))
            return
          }

          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          const durationSeconds = DURATION_MILLISECONDS[duration] / 1000

          oscillator.type = 'triangle'
          oscillator.frequency.setValueAtTime(
            NOTE_FREQUENCIES[note],
            audioContext.currentTime,
          )

          const releaseEnd =
            audioContext.currentTime + durationSeconds - GAIN_RELEASE_TIME

          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(
            0.1,
            audioContext.currentTime + GAIN_ATTACK_TIME,
          )
          gainNode.gain.exponentialRampToValueAtTime(
            GAIN_NEAR_SILENT,
            releaseEnd,
          )

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          oscillator.start()
          oscillator.stop(audioContext.currentTime + durationSeconds)

          oscillator.onended = () => {
            gainNode.disconnect()
            resume(Effect.succeed(Message.CompletedPlayNote({ noteIndex })))
          }
        })
      }).pipe(
        Effect.catchTag('ResourceNotAvailable', () =>
          Effect.sleep(Duration.millis(DURATION_MILLISECONDS[duration])).pipe(
            Effect.map(() => Message.CompletedPlayNote({ noteIndex })),
          ),
        ),
      )
  },
})

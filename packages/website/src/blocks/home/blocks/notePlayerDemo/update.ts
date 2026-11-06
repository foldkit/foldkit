import { Array, Match, Number, String } from 'effect'
import { FieldValidation } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  AudioState,
  type Model,
  type Note,
  PlaybackState,
  makeFieldsStep,
  makeNoopStep,
} from './block'
import { DelayAdvanceNotePlayerPhase, PlayNote } from './command'
import { NotePlayerDemoComposition } from './composition'
import { prependToLog } from './messageLog'
import { parseNotes, validateNoteInput } from './noteInput'

const enterNoteCommandPhase = (
  model: Model,
  noteSequence: ReadonlyArray<Note>,
  noteIndex: number,
) => ({
  model: modifyFields(model, {
    playbackState: () =>
      PlaybackState.Playing({
        noteSequence,
        currentNoteIndex: noteIndex,
      }),
    highlightPhase: () => 'NoteCommand',
  }),
  commands: [
    PlayNote({
      note: Array.getUnsafe(noteSequence, noteIndex),
      duration: model.noteDuration,
      noteIndex,
    }),
  ],
})

export const update = NotePlayerDemoComposition.makeUpdate({
  ChangedNoteInput: makeFieldsStep.fromMessage(({ value }) => {
    const uppercased = String.toUpperCase(value)
    const fieldState = String.isEmpty(uppercased)
      ? FieldValidation.NotValidated({ value: uppercased })
      : validateNoteInput(uppercased)

    return {
      noteInput: () => fieldState,
      playbackState: () => PlaybackState.Idle(),
      highlightPhase: () => 'Idle',
    }
  }),

  ClickedPlay: model =>
    PlaybackState.match(model.playbackState, {
      Playing: () => ({ model }),
      Paused: ({ noteSequence, currentNoteIndex }) => {
        const resumeIndex = currentNoteIndex + 1

        if (resumeIndex >= noteSequence.length) {
          return {
            model: modifyFields(model, {
              playbackState: () => PlaybackState.Idle(),
              highlightPhase: () => 'Idle',
              messageLog: prependToLog('ClickedPlay'),
            }),
          }
        }

        const nextGeneration = model.generation + 1

        return {
          model: modifyFields(model, {
            playbackState: () =>
              PlaybackState.Playing({
                noteSequence,
                currentNoteIndex: resumeIndex,
              }),
            highlightPhase: () => 'PlayMessage',
            generation: () => nextGeneration,
            messageLog: prependToLog('ClickedPlay'),
          }),
          commands: [
            DelayAdvanceNotePlayerPhase({ generation: nextGeneration }),
          ],
        }
      },
      Idle: () => {
        const noteSequence =
          model.noteInput._tag === 'Valid'
            ? parseNotes(model.noteInput.value)
            : []

        if (Array.isReadonlyArrayEmpty(noteSequence)) {
          return { model }
        }

        const nextGeneration = model.generation + 1

        return {
          model: modifyFields(model, {
            playbackState: () =>
              PlaybackState.Playing({
                noteSequence,
                currentNoteIndex: 0,
              }),
            highlightPhase: () => 'PlayMessage',
            generation: () => nextGeneration,
            messageLog: prependToLog('ClickedPlay'),
          }),
          commands: [
            DelayAdvanceNotePlayerPhase({ generation: nextGeneration }),
          ],
        }
      },
    }),

  ClickedPause: model =>
    Match.value(model.playbackState).pipe(
      Match.tag('Playing', ({ noteSequence, currentNoteIndex }) => {
        const nextGeneration = model.generation + 1

        return {
          model: modifyFields(model, {
            playbackState: () =>
              PlaybackState.Paused({
                noteSequence,
                currentNoteIndex,
              }),
            highlightPhase: () => 'PauseMessage',
            generation: () => nextGeneration,
            messageLog: prependToLog('ClickedPause'),
          }),
          commands: [
            DelayAdvanceNotePlayerPhase({ generation: nextGeneration }),
          ],
        }
      }),
      Match.orElse(() => ({ model })),
    ),

  ClickedStop: makeFieldsStep(() => ({
    playbackState: () => PlaybackState.Idle(),
    highlightPhase: () => 'Idle',
    messageLog: prependToLog('ClickedStop'),
  })),

  CompletedPlayNote: (model, { noteIndex }) => {
    if (
      model.playbackState._tag !== 'Playing' ||
      noteIndex !== model.playbackState.currentNoteIndex
    ) {
      return { model }
    }

    const nextGeneration = model.generation + 1

    return {
      model: modifyFields(model, {
        highlightPhase: () => 'NoteMessage',
        generation: () => nextGeneration,
        messageLog: prependToLog(`CompletedPlayNote(${noteIndex})`),
      }),
      commands: [DelayAdvanceNotePlayerPhase({ generation: nextGeneration })],
    }
  },

  CompletedDelayAdvanceNotePlayerPhase: (model, { generation }) => {
    if (generation !== model.generation) {
      return { model }
    }

    return Match.value(model.highlightPhase).pipe(
      Match.when('PlayMessage', () => ({
        model: modifyFields(model, { highlightPhase: () => 'PlayUpdate' }),
        commands: [DelayAdvanceNotePlayerPhase({ generation: generation })],
      })),
      Match.when('PauseMessage', () => ({
        model: modifyFields(model, { highlightPhase: () => 'Idle' }),
      })),
      Match.when('PlayUpdate', () => ({
        model: modifyFields(model, { highlightPhase: () => 'PlayModel' }),
        commands: [DelayAdvanceNotePlayerPhase({ generation: generation })],
      })),
      Match.when('PlayModel', () => {
        if (model.playbackState._tag !== 'Playing') {
          return {
            model: modifyFields(model, { highlightPhase: () => 'Idle' }),
          }
        }

        const { noteSequence, currentNoteIndex } = model.playbackState

        return enterNoteCommandPhase(model, noteSequence, currentNoteIndex)
      }),
      Match.when('NoteMessage', () => ({
        model: modifyFields(model, { highlightPhase: () => 'NoteUpdate' }),
        commands: [DelayAdvanceNotePlayerPhase({ generation: generation })],
      })),
      Match.when('NoteUpdate', () => ({
        model: modifyFields(model, { highlightPhase: () => 'NoteModel' }),
        commands: [DelayAdvanceNotePlayerPhase({ generation: generation })],
      })),
      Match.when('NoteModel', () => {
        if (model.playbackState._tag !== 'Playing') {
          return {
            model: modifyFields(model, { highlightPhase: () => 'Idle' }),
          }
        }

        const { noteSequence, currentNoteIndex } = model.playbackState
        const nextIndex = Number.increment(currentNoteIndex)

        if (nextIndex >= noteSequence.length) {
          return {
            model: modifyFields(model, {
              playbackState: () => PlaybackState.Idle(),
              highlightPhase: () => 'Idle',
            }),
          }
        }

        return enterNoteCommandPhase(model, noteSequence, nextIndex)
      }),
      Match.whenOr('Idle', 'NoteCommand', () => ({ model })),
      Match.exhaustive,
    )
  },

  SucceededAcquireAudioContext: makeFieldsStep(() => ({
    audio: () => AudioState.Ready(),
  })),

  FailedAcquireAudioContext: makeFieldsStep(() => ({
    audio: () => AudioState.Unavailable(),
  })),

  ReleasedAudioContext: makeNoopStep(),
})

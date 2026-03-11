import { clsx } from 'clsx'
import {
  Array,
  Duration,
  Effect,
  Match as M,
  Number,
  Option,
  Schema as S,
  String as Str,
  pipe,
} from 'effect'
import { FieldValidation, Task } from 'foldkit'
import { Command } from 'foldkit/command'
import { makeField } from 'foldkit/fieldValidation'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import notePlayerDemoCodeHtml from 'virtual:note-player-demo-code'

import {
  AriaChecked,
  AriaLabel,
  Autocomplete,
  Class,
  Disabled,
  For,
  Id,
  Maxlength,
  OnClick,
  OnInput,
  Placeholder,
  Role,
  Value,
  button,
  div,
  input,
  keyed,
  label,
  p,
  span,
} from '../html'
import { Icon } from '../icon'
import type { Message as ParentMessage } from '../main'
import * as DemoView from './demoView'

// CONSTANTS

const NOTE_FREQUENCIES: Record<Note, number> = {
  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.0,
  A: 440.0,
  B: 493.88,
}

const DURATION_MILLISECONDS: Record<NoteDuration, number> = {
  Short: 200,
  Medium: 400,
  Long: 800,
}

const GAIN_ATTACK_TIME = 0.01
const GAIN_RELEASE_TIME = 0.02
const GAIN_NEAR_SILENT = 0.001
const PHASE_DURATION: Duration.DurationInput = '150 millis'
const MAX_LOG_ENTRIES = 50
const MIN_NOTES = 2
const MAX_NOTES = 8

// MODEL

const Note = S.Literal('A', 'B', 'C', 'D', 'E', 'F', 'G')
type Note = typeof Note.Type

const NoteDuration = S.Literal('Short', 'Medium', 'Long')
type NoteDuration = typeof NoteDuration.Type

const NoteInputField = makeField(S.String)

const Idle = ts('Idle')
const Playing = ts('Playing', {
  noteSequence: S.Array(Note),
  currentNoteIndex: S.Number,
})
const Paused = ts('Paused', {
  noteSequence: S.Array(Note),
  currentNoteIndex: S.Number,
})
const PlaybackState = S.Union(Idle, Playing, Paused)

const NoteHighlightPhase = S.Literal(
  'Idle',
  'PlayMessage',
  'PlayUpdate',
  'PlayModel',
  'PauseMessage',
  'NoteMessage',
  'NoteUpdate',
  'NoteModel',
  'NoteCommand',
)
type NoteHighlightPhase = typeof NoteHighlightPhase.Type

export const Model = S.Struct({
  noteInput: NoteInputField.Union,
  noteDuration: NoteDuration,
  playbackState: PlaybackState,
  highlightPhase: NoteHighlightPhase,
  generation: S.Number,
  messageLog: S.Array(S.String),
})

export type Model = typeof Model.Type

// MESSAGE

const ChangedNoteInput = m('ChangedNoteInput', { value: S.String })
const SelectedNoteDuration = m('SelectedNoteDuration', {
  duration: NoteDuration,
})
const ClickedPlay = m('ClickedPlay')
const ClickedPause = m('ClickedPause')
const ClickedStop = m('ClickedStop')
const PlayedNote = m('PlayedNote', { noteIndex: S.Number })
const AdvancedNotePhase = m('AdvancedNotePhase', {
  generation: S.Number,
})

export const Message = S.Union(
  ChangedNoteInput,
  SelectedNoteDuration,
  ClickedPlay,
  ClickedPause,
  ClickedStop,
  PlayedNote,
  AdvancedNotePhase,
)
export type Message = typeof Message.Type

// FIELD VALIDATION

const noteInputValidations = [
  FieldValidation.required('Enter some notes'),
  FieldValidation.pattern(/^[A-G]+$/, 'Use notes A through G'),
  FieldValidation.minLength(MIN_NOTES, `Enter at least ${MIN_NOTES} notes`),
  FieldValidation.maxLength(MAX_NOTES, `Enter at most ${MAX_NOTES} notes`),
]

const validateNoteInput = NoteInputField.validate(noteInputValidations)

const parseNotes = (value: string) =>
  pipe(
    value,
    Array.fromIterable,
    Array.filterMap(character => S.decodeUnknownOption(Note)(character)),
  )
// INIT

const INITIAL_NOTE_SEQUENCE = 'CDEFGABC'

export const init = (): [
  Model,
  ReadonlyArray<Command<Message, never, AudioContextService>>,
] => [
  {
    noteInput: validateNoteInput(INITIAL_NOTE_SEQUENCE),
    noteDuration: 'Medium',
    playbackState: Idle(),
    highlightPhase: 'Idle',
    generation: 0,
    messageLog: [],
  },
  [],
]

// UPDATE

type UpdateReturn = [
  Model,
  ReadonlyArray<Command<Message, never, AudioContextService>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const prependToLog =
  (entry: string) =>
  (messageLog: ReadonlyArray<string>): ReadonlyArray<string> =>
    Array.take([entry, ...messageLog], MAX_LOG_ENTRIES)

const sleepThenAdvance = (
  generation: number,
): Command<typeof AdvancedNotePhase> =>
  Task.delay(PHASE_DURATION).pipe(Effect.as(AdvancedNotePhase({ generation })))

const enterNoteCommandPhase = (
  model: Model,
  noteSequence: ReadonlyArray<Note>,
  noteIndex: number,
): UpdateReturn => [
  evo(model, {
    playbackState: () =>
      Playing({
        noteSequence,
        currentNoteIndex: noteIndex,
      }),
    highlightPhase: () => 'NoteCommand',
  }),
  [
    playNote(
      Array.unsafeGet(noteSequence, noteIndex),
      model.noteDuration,
      noteIndex,
    ),
  ],
]

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ChangedNoteInput: ({ value }) => {
        const uppercased = Str.toUpperCase(value)
        const fieldState = Str.isEmpty(uppercased)
          ? NoteInputField.NotValidated({ value: uppercased })
          : validateNoteInput(uppercased)

        return [
          evo(model, {
            noteInput: () => fieldState,
            playbackState: () => Idle(),
            highlightPhase: () => 'Idle',
          }),
          [],
        ]
      },

      SelectedNoteDuration: ({ duration }) => [
        evo(model, {
          noteDuration: () => duration,
          messageLog: prependToLog(`SelectedNoteDuration(${duration})`),
        }),
        [],
      ],

      ClickedPlay: () =>
        M.value(model.playbackState).pipe(
          withUpdateReturn,
          M.tag('Playing', () => [model, []]),
          M.tag('Paused', ({ noteSequence, currentNoteIndex }) => {
            const resumeIndex = currentNoteIndex + 1

            if (resumeIndex >= noteSequence.length) {
              return [
                evo(model, {
                  playbackState: () => Idle(),
                  highlightPhase: () => 'Idle',
                  messageLog: prependToLog('ClickedPlay'),
                }),
                [],
              ]
            }

            const nextGeneration = model.generation + 1

            return [
              evo(model, {
                playbackState: () =>
                  Playing({
                    noteSequence,
                    currentNoteIndex: resumeIndex,
                  }),
                highlightPhase: () => 'PlayMessage',
                generation: () => nextGeneration,
                messageLog: prependToLog('ClickedPlay'),
              }),
              [sleepThenAdvance(nextGeneration)],
            ]
          }),
          M.tag('Idle', () => {
            const noteSequence =
              model.noteInput._tag === 'Valid'
                ? parseNotes(model.noteInput.value)
                : []

            if (Array.isEmptyArray(noteSequence)) {
              return [model, []]
            }

            const nextGeneration = model.generation + 1

            return [
              evo(model, {
                playbackState: () =>
                  Playing({
                    noteSequence,
                    currentNoteIndex: 0,
                  }),
                highlightPhase: () => 'PlayMessage',
                generation: () => nextGeneration,
                messageLog: prependToLog('ClickedPlay'),
              }),
              [sleepThenAdvance(nextGeneration)],
            ]
          }),
          M.exhaustive,
        ),

      ClickedPause: () =>
        M.value(model.playbackState).pipe(
          withUpdateReturn,
          M.tag('Playing', ({ noteSequence, currentNoteIndex }) => {
            const nextGeneration = model.generation + 1

            return [
              evo(model, {
                playbackState: () =>
                  Paused({
                    noteSequence,
                    currentNoteIndex,
                  }),
                highlightPhase: () => 'PauseMessage',
                generation: () => nextGeneration,
                messageLog: prependToLog('ClickedPause'),
              }),
              [sleepThenAdvance(nextGeneration)],
            ]
          }),
          M.orElse(() => [model, []]),
        ),

      ClickedStop: () => [
        evo(model, {
          playbackState: () => Idle(),
          highlightPhase: () => 'Idle',
          messageLog: prependToLog('ClickedStop'),
        }),
        [],
      ],

      PlayedNote: ({ noteIndex }) => {
        if (
          model.playbackState._tag !== 'Playing' ||
          noteIndex !== model.playbackState.currentNoteIndex
        ) {
          return [model, []]
        }

        const nextGeneration = model.generation + 1

        return [
          evo(model, {
            highlightPhase: () => 'NoteMessage',
            generation: () => nextGeneration,
            messageLog: prependToLog(`PlayedNote(${noteIndex})`),
          }),
          [sleepThenAdvance(nextGeneration)],
        ]
      },

      AdvancedNotePhase: ({ generation }) => {
        if (generation !== model.generation) {
          return [model, []]
        }

        return M.value(model.highlightPhase).pipe(
          withUpdateReturn,
          M.when('PlayMessage', () => [
            evo(model, { highlightPhase: () => 'PlayUpdate' }),
            [sleepThenAdvance(generation)],
          ]),
          M.when('PauseMessage', () => [
            evo(model, { highlightPhase: () => 'Idle' }),
            [],
          ]),
          M.when('PlayUpdate', () => [
            evo(model, { highlightPhase: () => 'PlayModel' }),
            [sleepThenAdvance(generation)],
          ]),
          M.when('PlayModel', () => {
            if (model.playbackState._tag !== 'Playing') {
              return [evo(model, { highlightPhase: () => 'Idle' }), []]
            }

            const { noteSequence, currentNoteIndex } = model.playbackState

            return enterNoteCommandPhase(model, noteSequence, currentNoteIndex)
          }),
          M.when('NoteMessage', () => [
            evo(model, { highlightPhase: () => 'NoteUpdate' }),
            [sleepThenAdvance(generation)],
          ]),
          M.when('NoteUpdate', () => [
            evo(model, { highlightPhase: () => 'NoteModel' }),
            [sleepThenAdvance(generation)],
          ]),
          M.when('NoteModel', () => {
            if (model.playbackState._tag !== 'Playing') {
              return [evo(model, { highlightPhase: () => 'Idle' }), []]
            }

            const { noteSequence, currentNoteIndex } = model.playbackState
            const nextIndex = Number.increment(currentNoteIndex)

            if (nextIndex >= noteSequence.length) {
              return [
                evo(model, {
                  playbackState: () => Idle(),
                  highlightPhase: () => 'Idle',
                }),
                [],
              ]
            }

            return enterNoteCommandPhase(model, noteSequence, nextIndex)
          }),
          M.whenOr('Idle', 'NoteCommand', () => [model, []]),
          M.exhaustive,
        )
      },
    }),
  )

// COMMAND

export class AudioContextService extends Effect.Service<AudioContextService>()(
  'AudioContextService',
  {
    sync: () => new AudioContext(),
  },
) {}

const playNote = (
  note: Note,
  duration: NoteDuration,
  noteIndex: number,
): Command<typeof PlayedNote, never, AudioContextService> =>
  Effect.gen(function* () {
    const audioContext = yield* AudioContextService

    return yield* Effect.async<typeof PlayedNote.Type>(resume => {
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
      gainNode.gain.exponentialRampToValueAtTime(GAIN_NEAR_SILENT, releaseEnd)

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.start()
      oscillator.stop(audioContext.currentTime + durationSeconds)

      oscillator.onended = () => {
        gainNode.disconnect()
        resume(Effect.succeed(PlayedNote({ noteIndex })))
      }
    })
  })

// VIEW

const inputBorderClass = (field: typeof NoteInputField.Union.Type): string =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300 dark:border-gray-600',
      Validating: () => 'border-accent-300 dark:border-accent-600',
      Valid: () => 'border-gray-300 dark:border-gray-600',
      Invalid: () => 'border-red-500 dark:border-red-400',
    }),
  )

const durationButtonClass = (
  isSelected: boolean,
  isInputLocked: boolean,
): string =>
  clsx('flex-1 px-3 py-1.5 text-sm font-normal transition text-center', {
    'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900': isSelected,
    'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer':
      !isSelected && !isInputLocked,
    'text-gray-300 dark:text-gray-600 cursor-not-allowed':
      !isSelected && isInputLocked,
  })

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  DemoView.demoViewShell(
    DemoView.codePanelView(
      'note-demo-code-panel',
      'note-demo-phase',
      model.highlightPhase,
      notePlayerDemoCodeHtml,
    ),
    appPanel(model, toMessage),
  )

const appPanel = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const isPlaying = model.playbackState._tag === 'Playing'
  const isPaused = model.playbackState._tag === 'Paused'
  const isInputLocked = isPlaying || isPaused
  const isValid = model.noteInput._tag === 'Valid'
  const canPlay = isValid && !isPlaying

  return div(
    [Class('relative')],
    [
      div(
        [Class('lg:absolute lg:inset-0 flex flex-col gap-4 overflow-hidden')],
        [
          div(
            [Class('flex flex-col gap-3')],
            [
              noteSequenceView(model),
              noteInputView(model, isInputLocked, toMessage),
              durationSelectorView(model, isInputLocked, toMessage),
              playbackControlView(model, canPlay, toMessage),
            ],
          ),
          DemoView.modelStateView([
            DemoView.modelStateField(
              'playbackState',
              playbackStateLabel(model),
            ),
            DemoView.modelStateField('noteDuration', model.noteDuration),
            DemoView.modelStateField('noteInput', noteInputLabel(model)),
          ]),
          phaseIndicatorView(model),
          DemoView.eventLogView(model.messageLog),
        ],
      ),
    ],
  )
}

const noteInputView = (
  model: Model,
  isInputLocked: boolean,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [
      Class(
        clsx('flex flex-col gap-1.5 transition-opacity', {
          'opacity-50': isInputLocked,
        }),
      ),
    ],
    [
      label(
        [For('note-input'), Class('text-xs text-gray-500 dark:text-gray-400')],
        ['Note Sequence'],
      ),
      input([
        Id('note-input'),
        Class(
          clsx(
            'w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border text-sm text-gray-800 dark:text-gray-200 font-mono tracking-widest uppercase transition',
            inputBorderClass(model.noteInput),
          ),
        ),
        Placeholder('CDEFGAB'),
        Value(model.noteInput.value),
        Maxlength(MAX_NOTES),
        Autocomplete('off'),
        Disabled(isInputLocked),
        AriaLabel('Note sequence'),
        OnInput(value => toMessage(ChangedNoteInput({ value }))),
      ]),
      M.value(model.noteInput).pipe(
        M.tagsExhaustive({
          NotValidated: () =>
            p(
              [Class('text-xs text-gray-400 dark:text-gray-500')],
              [`${MIN_NOTES}\u2013${MAX_NOTES} notes, A through G`],
            ),
          Validating: () =>
            p([Class('text-xs text-gray-400 dark:text-gray-500')], ['']),
          Valid: () =>
            p(
              [Class('text-xs text-gray-500 dark:text-gray-400')],
              [`${parseNotes(model.noteInput.value).length} notes`],
            ),
          Invalid: ({ errors }) =>
            p(
              [Class('text-xs text-red-600 dark:text-red-400')],
              [Array.headNonEmpty(errors)],
            ),
        }),
      ),
    ],
  )

const durationSelectorView = (
  model: Model,
  isInputLocked: boolean,
  toMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [Class('flex flex-col gap-1.5')],
    [
      label(
        [Class('text-xs text-gray-500 dark:text-gray-400')],
        ['Note Length'],
      ),
      div(
        [
          Class('flex rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden'),
          Role('radiogroup'),
          AriaLabel('Note length'),
        ],
        Array.map(['Short', 'Medium', 'Long'] as const, duration => {
          const isSelected = model.noteDuration === duration

          return button(
            [
              Class(durationButtonClass(isSelected, isInputLocked)),
              Role('radio'),
              AriaChecked(isSelected),
              Disabled(isInputLocked),
              OnClick(toMessage(SelectedNoteDuration({ duration }))),
            ],
            [duration],
          )
        }),
      ),
    ],
  )

const playbackControlView = (
  model: Model,
  canPlay: boolean,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const isPlaying = model.playbackState._tag === 'Playing'
  const isActive = isPlaying || model.playbackState._tag === 'Paused'

  return div(
    [Class('flex gap-2')],
    [
      isPlaying
        ? button(
            [
              Class(
                'flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-normal transition bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 hover:bg-accent-700 dark:hover:bg-accent-600 active:bg-accent-800 dark:active:bg-accent-700 cursor-pointer',
              ),
              AriaLabel('Pause'),
              OnClick(toMessage(ClickedPause())),
            ],
            [Icon.pause('w-4 h-4'), 'Pause'],
          )
        : button(
            [
              Class(
                clsx(
                  'flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-normal transition',
                  {
                    'bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 hover:bg-accent-700 dark:hover:bg-accent-600 active:bg-accent-800 dark:active:bg-accent-700 cursor-pointer':
                      canPlay,
                    'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed':
                      !canPlay,
                  },
                ),
              ),
              Disabled(!canPlay),
              AriaLabel('Play'),
              OnClick(toMessage(ClickedPlay())),
            ],
            [Icon.play('w-4 h-4'), 'Play'],
          ),
      button(
        [
          Class(
            clsx(
              'flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-normal transition',
              {
                'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer':
                  isActive,
                'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed':
                  !isActive,
              },
            ),
          ),
          Disabled(!isActive),
          AriaLabel('Stop'),
          OnClick(toMessage(ClickedStop())),
        ],
        [Icon.stop('w-4 h-4'), 'Stop'],
      ),
    ],
  )
}

const placeholderVisualizerView: Html = div(
  [Class('flex gap-2')],
  Array.makeBy(MIN_NOTES, index =>
    keyed('div')(
      `placeholder-${index}`,
      [
        Class(
          'flex-1 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-gray-200 dark:bg-gray-800 text-gray-300 dark:text-gray-600',
        ),
      ],
      [span([], ['\u2013'])],
    ),
  ),
)

const noteSequenceView = (model: Model): Html => {
  const notes = parseNotes(model.noteInput.value)

  return div(
    [
      Class(
        'flex flex-col gap-2 pb-3 border-b border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      Array.match(notes, {
        onEmpty: () => placeholderVisualizerView,
        onNonEmpty: validNotes => noteVisualizerView(model, validNotes),
      }),
    ],
  )
}

const noteVisualizerView = (model: Model, notes: ReadonlyArray<Note>): Html => {
  const maybeCurrentIndex = M.value(model.playbackState).pipe(
    M.tag('Playing', 'Paused', ({ currentNoteIndex }) =>
      Option.some(currentNoteIndex),
    ),
    M.tag('Idle', () => Option.none()),
    M.exhaustive,
  )

  return div(
    [Class('flex gap-2')],
    Array.map(notes, (note, index) => {
      const isCurrentNote = Option.exists(
        maybeCurrentIndex,
        currentIndex => currentIndex === index,
      )
      const key = `${note}-${index}`

      return keyed('div')(
        key,
        [
          Class(
            clsx(
              'flex-1 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-colors duration-150',
              {
                'bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900':
                  isCurrentNote,
                'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300':
                  !isCurrentNote,
              },
            ),
          ),
        ],
        [span([], [note])],
      )
    }),
  )
}

const noteInputLabel = (model: Model): string =>
  M.value(model.noteInput).pipe(
    M.tagsExhaustive({
      Valid: ({ value }) => `Valid("${value}")`,
      Invalid: ({ errors }) => `Invalid("${Array.headNonEmpty(errors)}")`,
      NotValidated: ({ value }) => `NotValidated("${value}")`,
      Validating: ({ value }) => `Validating("${value}")`,
    }),
  )

const playbackStateLabel = (model: Model): string =>
  M.value(model.playbackState).pipe(
    M.tag('Idle', () => 'Idle'),
    M.tag(
      'Playing',
      ({ currentNoteIndex, noteSequence }) =>
        `Playing(${currentNoteIndex + 1}/${noteSequence.length})`,
    ),
    M.tag(
      'Paused',
      ({ currentNoteIndex, noteSequence }) =>
        `Paused(${currentNoteIndex + 1}/${noteSequence.length})`,
    ),
    M.exhaustive,
  )

const phaseLabel = (phase: NoteHighlightPhase): string =>
  M.value(phase).pipe(
    M.when('Idle', () => 'Idle'),
    M.whenOr('PlayMessage', 'PauseMessage', 'NoteMessage', () => 'Message'),
    M.whenOr('PlayUpdate', 'NoteUpdate', () => 'Update'),
    M.whenOr('PlayModel', 'NoteModel', () => 'Model'),
    M.when('NoteCommand', () => 'Command'),
    M.exhaustive,
  )

const phaseColorClass = (phase: NoteHighlightPhase): string =>
  M.value(phase).pipe(
    M.when('Idle', () => 'text-gray-400 dark:text-gray-500'),
    M.whenOr(
      'PlayMessage',
      'PauseMessage',
      'NoteMessage',
      () => 'text-emerald-600 dark:text-emerald-400',
    ),
    M.whenOr(
      'PlayUpdate',
      'NoteUpdate',
      () => 'text-amber-600 dark:text-amber-400',
    ),
    M.whenOr(
      'PlayModel',
      'NoteModel',
      () => 'text-accent-600 dark:text-accent-400',
    ),
    M.when('NoteCommand', () => 'text-violet-600 dark:text-violet-400'),
    M.exhaustive,
  )

const phaseIndicatorView = (model: Model): Html =>
  DemoView.phaseIndicatorView(
    phaseLabel(model.highlightPhase),
    phaseColorClass(model.highlightPhase),
    [],
  )

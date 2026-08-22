import { clsx } from 'clsx'
import {
  Array,
  Duration,
  Effect,
  Match as M,
  Number,
  Option,
  Result,
  Schema as S,
  String as Str,
  pipe,
} from 'effect'
import {
  Command,
  FieldValidation,
  ManagedResource,
  Submodel,
  Update,
} from 'foldkit'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import notePlayerDemoCodeHtml from 'virtual:note-player-demo-code'

import { Button, Input, RadioGroup } from '@foldkit/ui'

import { Icon } from '../icon'
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
const PHASE_DURATION: Duration.Input = '150 millis'
const MAX_LOG_ENTRIES = 50
const MIN_NOTES = 2
const MAX_NOTES = 8
const NOTE_DURATION_RADIO_GROUP_ID = 'note-duration'

// MODEL

const Note = S.Literals(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
type Note = typeof Note.Type

const NoteDuration = S.Literals(['Short', 'Medium', 'Long'])
type NoteDuration = typeof NoteDuration.Type

const NoteDurationRadioGroup = RadioGroup.create<NoteDuration>()

const noteInputRules = FieldValidation.makeRules({
  required: 'Enter some notes',
  rules: [
    FieldValidation.Rule.pattern(/^[A-G]+$/, 'Use notes A through G'),
    FieldValidation.Rule.minLength(
      MIN_NOTES,
      `Enter at least ${MIN_NOTES} notes`,
    ),
    FieldValidation.Rule.maxLength(
      MAX_NOTES,
      `Enter at most ${MAX_NOTES} notes`,
    ),
  ],
})

const Idle = ts('Idle')
const Playing = ts('Playing', {
  noteSequence: S.Array(Note),
  currentNoteIndex: S.Number,
})
const Paused = ts('Paused', {
  noteSequence: S.Array(Note),
  currentNoteIndex: S.Number,
})
const PlaybackState = S.Union([Idle, Playing, Paused])

const NoteHighlightPhase = S.Literals([
  'Idle',
  'PlayMessage',
  'PlayUpdate',
  'PlayModel',
  'PauseMessage',
  'NoteMessage',
  'NoteUpdate',
  'NoteModel',
  'NoteCommand',
])
type NoteHighlightPhase = typeof NoteHighlightPhase.Type

const AudioAcquiring = ts('AudioAcquiring')
const AudioReady = ts('AudioReady')
const AudioUnavailable = ts('AudioUnavailable')
const AudioState = S.Union([AudioAcquiring, AudioReady, AudioUnavailable])
type AudioState = typeof AudioState.Type

export const Model = S.Struct({
  noteInput: FieldValidation.Field(S.String),
  noteDurationRadioGroup: RadioGroup.Model,
  noteDuration: NoteDuration,
  playbackState: PlaybackState,
  highlightPhase: NoteHighlightPhase,
  generation: S.Number,
  messageLog: S.Array(S.String),
  audio: AudioState,
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ChangedNoteInput: { value: S.String },
  GotNoteDurationMessage: { message: RadioGroup.Message },
  ClickedPlay: {},
  ClickedPause: {},
  ClickedStop: {},
  CompletedPlayNote: { noteIndex: S.Number },
  CompletedDelayAdvancePhase: { generation: S.Number },
  SucceededAcquireAudioContext: {},
  FailedAcquireAudioContext: {},
  ReleasedAudioContext: {},
})
export type Message = typeof Message.Type

// FIELD VALIDATION

const validateNoteInput = FieldValidation.validate(noteInputRules)

const parseNotes = (value: string) =>
  pipe(
    value,
    Array.fromIterable,
    Array.filterMap(character => {
      const decoded = S.decodeUnknownOption(Note)(character)
      return Option.match(decoded, {
        onNone: () => Result.failVoid,
        onSome: Result.succeed,
      })
    }),
  )
// INIT

const INITIAL_NOTE_SEQUENCE = 'CDEFGABC'

export const init = (): Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message, never, AudioContextService>>
  outMessage?: never
}> => ({
  model: {
    noteInput: validateNoteInput(INITIAL_NOTE_SEQUENCE),
    noteDurationRadioGroup: RadioGroup.init({
      id: NOTE_DURATION_RADIO_GROUP_ID,
    }),
    noteDuration: 'Medium',
    playbackState: Idle(),
    highlightPhase: 'Idle',
    generation: 0,
    messageLog: [],
    audio: AudioAcquiring(),
  },
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message, AudioContextService>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const prependToLog =
  (entry: string) =>
  (messageLog: ReadonlyArray<string>): ReadonlyArray<string> =>
    Array.take([entry, ...messageLog], MAX_LOG_ENTRIES)

const DelayAdvancePhase = Command.define('DelayAdvancePhase', {
  args: { generation: S.Number },
  messages: [Message.CompletedDelayAdvancePhase],
  execute: ({ generation }) =>
    Effect.sleep(PHASE_DURATION).pipe(
      Effect.as(Message.CompletedDelayAdvancePhase({ generation })),
    ),
})

const enterNoteCommandPhase = (
  model: Model,
  noteSequence: ReadonlyArray<Note>,
  noteIndex: number,
): UpdateReturn => ({
  model: evo(model, {
    playbackState: () =>
      Playing({
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

const foldNoteDurationRadioGroupOutMessage = M.type<
  RadioGroup.OutMessage<NoteDuration>
>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          noteDuration: () => value,
          messageLog: prependToLog(`Selected(${value})`),
        }),
      }),
  }),
)

const foldNoteDurationRadioGroup = Update.foldChild({
  update: NoteDurationRadioGroup.update,
  read: (model: Model) => Option.some(model.noteDurationRadioGroup),
  write: (model, nextNoteDurationRadioGroup) =>
    evo(model, { noteDurationRadioGroup: () => nextNoteDurationRadioGroup }),
  toParentMessage: message => Message.GotNoteDurationMessage({ message }),
  foldOutMessage: foldNoteDurationRadioGroupOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ChangedNoteInput: ({ value }) => {
      const uppercased = Str.toUpperCase(value)
      const fieldState = Str.isEmpty(uppercased)
        ? FieldValidation.NotValidated({ value: uppercased })
        : validateNoteInput(uppercased)

      return {
        model: evo(model, {
          noteInput: () => fieldState,
          playbackState: () => Idle(),
          highlightPhase: () => 'Idle',
        }),
      }
    },

    GotNoteDurationMessage: ({ message }) =>
      foldNoteDurationRadioGroup(model, message),

    ClickedPlay: () =>
      M.value(model.playbackState).pipe(
        withUpdateReturn,
        M.tag('Playing', () => ({ model })),
        M.tag('Paused', ({ noteSequence, currentNoteIndex }) => {
          const resumeIndex = currentNoteIndex + 1

          if (resumeIndex >= noteSequence.length) {
            return {
              model: evo(model, {
                playbackState: () => Idle(),
                highlightPhase: () => 'Idle',
                messageLog: prependToLog('ClickedPlay'),
              }),
            }
          }

          const nextGeneration = model.generation + 1

          return {
            model: evo(model, {
              playbackState: () =>
                Playing({
                  noteSequence,
                  currentNoteIndex: resumeIndex,
                }),
              highlightPhase: () => 'PlayMessage',
              generation: () => nextGeneration,
              messageLog: prependToLog('ClickedPlay'),
            }),
            commands: [DelayAdvancePhase({ generation: nextGeneration })],
          }
        }),
        M.tag('Idle', () => {
          const noteSequence =
            model.noteInput._tag === 'Valid'
              ? parseNotes(model.noteInput.value)
              : []

          if (Array.isReadonlyArrayEmpty(noteSequence)) {
            return { model }
          }

          const nextGeneration = model.generation + 1

          return {
            model: evo(model, {
              playbackState: () =>
                Playing({
                  noteSequence,
                  currentNoteIndex: 0,
                }),
              highlightPhase: () => 'PlayMessage',
              generation: () => nextGeneration,
              messageLog: prependToLog('ClickedPlay'),
            }),
            commands: [DelayAdvancePhase({ generation: nextGeneration })],
          }
        }),
        M.exhaustive,
      ),

    ClickedPause: () =>
      M.value(model.playbackState).pipe(
        withUpdateReturn,
        M.tag('Playing', ({ noteSequence, currentNoteIndex }) => {
          const nextGeneration = model.generation + 1

          return {
            model: evo(model, {
              playbackState: () =>
                Paused({
                  noteSequence,
                  currentNoteIndex,
                }),
              highlightPhase: () => 'PauseMessage',
              generation: () => nextGeneration,
              messageLog: prependToLog('ClickedPause'),
            }),
            commands: [DelayAdvancePhase({ generation: nextGeneration })],
          }
        }),
        M.orElse(() => ({ model })),
      ),

    ClickedStop: () => ({
      model: evo(model, {
        playbackState: () => Idle(),
        highlightPhase: () => 'Idle',
        messageLog: prependToLog('ClickedStop'),
      }),
    }),

    CompletedPlayNote: ({ noteIndex }) => {
      if (
        model.playbackState._tag !== 'Playing' ||
        noteIndex !== model.playbackState.currentNoteIndex
      ) {
        return { model }
      }

      const nextGeneration = model.generation + 1

      return {
        model: evo(model, {
          highlightPhase: () => 'NoteMessage',
          generation: () => nextGeneration,
          messageLog: prependToLog(`CompletedPlayNote(${noteIndex})`),
        }),
        commands: [DelayAdvancePhase({ generation: nextGeneration })],
      }
    },

    CompletedDelayAdvancePhase: ({ generation }) => {
      if (generation !== model.generation) {
        return { model }
      }

      return M.value(model.highlightPhase).pipe(
        withUpdateReturn,
        M.when('PlayMessage', () => ({
          model: evo(model, { highlightPhase: () => 'PlayUpdate' }),
          commands: [DelayAdvancePhase({ generation: generation })],
        })),
        M.when('PauseMessage', () => ({
          model: evo(model, { highlightPhase: () => 'Idle' }),
        })),
        M.when('PlayUpdate', () => ({
          model: evo(model, { highlightPhase: () => 'PlayModel' }),
          commands: [DelayAdvancePhase({ generation: generation })],
        })),
        M.when('PlayModel', () => {
          if (model.playbackState._tag !== 'Playing') {
            return { model: evo(model, { highlightPhase: () => 'Idle' }) }
          }

          const { noteSequence, currentNoteIndex } = model.playbackState

          return enterNoteCommandPhase(model, noteSequence, currentNoteIndex)
        }),
        M.when('NoteMessage', () => ({
          model: evo(model, { highlightPhase: () => 'NoteUpdate' }),
          commands: [DelayAdvancePhase({ generation: generation })],
        })),
        M.when('NoteUpdate', () => ({
          model: evo(model, { highlightPhase: () => 'NoteModel' }),
          commands: [DelayAdvancePhase({ generation: generation })],
        })),
        M.when('NoteModel', () => {
          if (model.playbackState._tag !== 'Playing') {
            return { model: evo(model, { highlightPhase: () => 'Idle' }) }
          }

          const { noteSequence, currentNoteIndex } = model.playbackState
          const nextIndex = Number.increment(currentNoteIndex)

          if (nextIndex >= noteSequence.length) {
            return {
              model: evo(model, {
                playbackState: () => Idle(),
                highlightPhase: () => 'Idle',
              }),
            }
          }

          return enterNoteCommandPhase(model, noteSequence, nextIndex)
        }),
        M.whenOr('Idle', 'NoteCommand', () => ({ model })),
        M.exhaustive,
      )
    },

    SucceededAcquireAudioContext: () => ({
      model: evo(model, { audio: () => AudioReady() }),
    }),

    FailedAcquireAudioContext: () => ({
      model: evo(model, { audio: () => AudioUnavailable() }),
    }),

    ReleasedAudioContext: () => ({ model }),
  })

// MANAGED RESOURCE

const AudioContextResource = ManagedResource.tag<AudioContext>()('AudioContext')
type AudioContextService = ManagedResource.ServiceOf<
  typeof AudioContextResource
>

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    audioContext: entry(S.Option(S.Null), {
      resource: AudioContextResource,
      modelToMaybeRequirements: () => Option.some(null),
      acquire: () =>
        Effect.try({
          try: () => new AudioContext(),
          catch: () =>
            new Error('The Web Audio API is unavailable in this browser.'),
        }),
      release: audioContext =>
        Effect.promise(() => audioContext.close().catch(() => undefined)),
      onAcquired: () => Message.SucceededAcquireAudioContext(),
      onReleased: () => Message.ReleasedAudioContext(),
      onAcquireError: () => Message.FailedAcquireAudioContext(),
    }),
  }),
)

// COMMAND

const PlayNote = Command.define('PlayNote', {
  args: { note: Note, duration: NoteDuration, noteIndex: S.Number },
  messages: [Message.CompletedPlayNote],
  execute: ({ note, duration, noteIndex }) =>
    Effect.gen(function* () {
      const audioContext = yield* AudioContextResource.get
      yield* Effect.promise(() => audioContext.resume().catch(() => undefined))

      return yield* Effect.callback<typeof Message.CompletedPlayNote.Type>(
        resume => {
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
        },
      )
    }).pipe(
      Effect.catchTag('ResourceNotAvailable', () =>
        Effect.sleep(Duration.millis(DURATION_MILLISECONDS[duration])).pipe(
          Effect.map(() => Message.CompletedPlayNote({ noteIndex })),
        ),
      ),
    ),
})

// VIEW

const inputBorderClass = (field: FieldValidation.Field<string>): string =>
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
  isDisabled: boolean,
): string =>
  clsx('flex-1 px-3 py-1.5 text-sm font-normal transition text-center', {
    'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900': isSelected,
    'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer':
      !isSelected && !isDisabled,
    'text-gray-300 dark:text-gray-600 cursor-not-allowed':
      !isSelected && isDisabled,
  })

export const view = Submodel.defineView<Model, Message>(
  (model, h): Html =>
    DemoView.demoViewShell(
      DemoView.codePanelView(
        'note-demo-code-panel',
        'note-demo-phase',
        model.highlightPhase,
        notePlayerDemoCodeHtml,
      ),
      appPanel(model, h),
    ),
)

const appPanel = (model: Model, h: HtmlBuilder<Message>): Html => {
  const isPlaying = model.playbackState._tag === 'Playing'
  const isPaused = model.playbackState._tag === 'Paused'
  const isInputLocked = isPlaying || isPaused
  const isValid = model.noteInput._tag === 'Valid'
  const canPlay = isValid && !isPlaying

  return h.div(
    [h.Class('relative')],
    [
      h.div(
        [h.Class('lg:absolute lg:inset-0 flex flex-col gap-4 overflow-hidden')],
        [
          h.div(
            [h.Class('flex flex-col gap-3')],
            [
              noteSequenceView(model),
              noteInputView(model, isInputLocked, h),
              durationSelectorView(model, isInputLocked, h),
              playbackControlView(model, canPlay, h),
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
  h: HtmlBuilder<Message>,
): Html =>
  Input.view(
    {
      id: 'note-input',
      value: model.noteInput.value,
      onInput: value => Message.ChangedNoteInput({ value }),
      isDisabled: isInputLocked,
      isInvalid: model.noteInput._tag === 'Invalid',
      placeholder: 'CDEFGAB',
      toView: attributes =>
        h.div(
          [
            h.Class(
              clsx('flex flex-col gap-1.5 transition-opacity', {
                'opacity-50': isInputLocked,
              }),
            ),
          ],
          [
            h.label(
              [
                ...attributes.label,
                h.For('note-input'),
                h.Class('text-xs text-gray-500 dark:text-gray-400'),
              ],
              ['Note Sequence'],
            ),
            h.input([
              ...attributes.input,
              h.Class(
                clsx(
                  'w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border text-sm text-gray-800 dark:text-gray-200 font-mono tracking-widest uppercase transition',
                  inputBorderClass(model.noteInput),
                ),
              ),
              h.Maxlength(MAX_NOTES),
              h.Autocomplete('off'),
            ]),
            M.value(model.noteInput).pipe(
              M.tagsExhaustive({
                NotValidated: () =>
                  h.p(
                    [h.Class('text-xs text-gray-400 dark:text-gray-500')],
                    [`${MIN_NOTES}–${MAX_NOTES} notes, A through G`],
                  ),
                Validating: () =>
                  h.p(
                    [h.Class('text-xs text-gray-400 dark:text-gray-500')],
                    [''],
                  ),
                Valid: () =>
                  h.p(
                    [h.Class('text-xs text-gray-500 dark:text-gray-400')],
                    [`${parseNotes(model.noteInput.value).length} notes`],
                  ),
                Invalid: ({ errors }) =>
                  h.p(
                    [h.Class('text-xs text-red-600 dark:text-red-400')],
                    [Array.headNonEmpty(errors)],
                  ),
              }),
            ),
          ],
        ),
    },
    h,
  )

const noteDurations: ReadonlyArray<NoteDuration> = ['Short', 'Medium', 'Long']

const durationSelectorView = (
  model: Model,
  isInputLocked: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.label(
        [h.Class('text-xs text-gray-500 dark:text-gray-400')],
        ['Note Length'],
      ),
      h.submodel({
        slotId: model.noteDurationRadioGroup.id,
        model: model.noteDurationRadioGroup,
        view: NoteDurationRadioGroup.view,
        viewInputs: {
          selectedValue: Option.some(model.noteDuration),
          options: noteDurations,
          ariaLabel: 'Note length',
          orientation: 'Horizontal',
          isDisabled: isInputLocked,
          toView: ({ group, options }) =>
            h.div(
              [
                ...group,
                h.Class(
                  'flex rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden',
                ),
              ],
              options.map(option =>
                h.div(
                  [
                    ...option.option,
                    h.Class(
                      durationButtonClass(option.isSelected, option.isDisabled),
                    ),
                  ],
                  [option.value],
                ),
              ),
            ),
        },
        toParentMessage: message => Message.GotNoteDurationMessage({ message }),
      }),
    ],
  )

const playbackControlView = (
  model: Model,
  canPlay: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  const isPlaying = model.playbackState._tag === 'Playing'
  const isActive = isPlaying || model.playbackState._tag === 'Paused'

  return h.div(
    [h.Class('flex flex-col gap-2')],
    [
      h.div(
        [h.Class('flex gap-2')],
        [
          isPlaying
            ? Button.view(
                {
                  onClick: Message.ClickedPause(),
                  toView: attributes =>
                    h.button(
                      [
                        ...attributes.button,
                        h.Class(
                          'flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-normal transition bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 hover:bg-accent-700 dark:hover:bg-accent-600 active:bg-accent-800 dark:active:bg-accent-700 cursor-pointer',
                        ),
                        h.AriaLabel('Pause'),
                      ],
                      [Icon.pause('w-4 h-4'), 'Pause'],
                    ),
                },
                h,
              )
            : Button.view(
                {
                  onClick: Message.ClickedPlay(),
                  isDisabled: !canPlay,
                  toView: attributes =>
                    h.button(
                      [
                        ...attributes.button,
                        h.Class(
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
                        h.AriaLabel('Play'),
                      ],
                      [Icon.play('w-4 h-4'), 'Play'],
                    ),
                },
                h,
              ),
          Button.view(
            {
              onClick: Message.ClickedStop(),
              isDisabled: !isActive,
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
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
                    h.AriaLabel('Stop'),
                  ],
                  [Icon.stop('w-4 h-4'), 'Stop'],
                ),
            },
            h,
          ),
        ],
      ),
      ...audioUnavailableNoticeView(model.audio),
    ],
  )
}

const audioUnavailableNoticeView = (audio: AudioState): ReadonlyArray<Html> =>
  M.value(audio).pipe(
    M.withReturnType<ReadonlyArray<Html>>(),
    M.tag('AudioUnavailable', () => [
      ih.p(
        [ih.Class('text-xs text-amber-600 dark:text-amber-500')],
        ['No audio output in this browser, so playback stays silent.'],
      ),
    ]),
    M.orElse(() => []),
  )

const placeholderVisualizerView = (): Html =>
  ih.div(
    [ih.Class('flex gap-2')],
    Array.makeBy(MIN_NOTES, index =>
      ih.keyed('div')(
        `placeholder-${index}`,
        [
          ih.Class(
            'flex-1 h-10 rounded-lg flex items-center justify-center text-sm font-bold bg-gray-200 dark:bg-gray-800 text-gray-300 dark:text-gray-600',
          ),
        ],
        [ih.span([], ['–'])],
      ),
    ),
  )

const noteSequenceView = (model: Model): Html => {
  const notes = parseNotes(model.noteInput.value)

  return ih.div(
    [
      ih.Class(
        'flex flex-col gap-2 pb-3 border-b border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      Array.match(notes, {
        onEmpty: () => placeholderVisualizerView(),
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

  return ih.div(
    [ih.Class('flex gap-2')],
    Array.map(notes, (note, index) => {
      const isCurrentNote = Option.exists(
        maybeCurrentIndex,
        currentIndex => currentIndex === index,
      )
      const key = `${note}-${index}`

      return ih.keyed('div')(
        key,
        [
          ih.Class(
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
        [ih.span([], [note])],
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
    M.when('Idle', () => 'text-gray-500 dark:text-gray-400'),
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

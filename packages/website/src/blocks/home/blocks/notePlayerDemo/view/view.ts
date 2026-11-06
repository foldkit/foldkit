import { clsx } from 'clsx'
import { Array, Match, Option } from 'effect'
import { FieldValidation } from 'foldkit'
import { type Html, inertHtml as ih } from 'foldkit/html'
import notePlayerDemoCodeHtml from 'virtual:note-player-demo-code'

import { Button, Input as UiInput } from '@foldkit/ui'

import { Icon } from '../../../../../icon'
import * as DemoView from '../../../view/demo'
import {
  AudioState,
  Message,
  type Model,
  type Note,
  NoteDuration,
  type NoteHighlightPhase,
  PlaybackState,
} from '../block'
import {
  NoteDurationRadioGroupBinding,
  NotePlayerDemoComposition,
  type NotePlayerDemoViewBuilder,
} from '../composition'
import { MAX_NOTES, MIN_NOTES, parseNotes } from '../noteInput'

const inputBorderClass = (field: FieldValidation.Field<string>): string =>
  FieldValidation.match(field, {
    onNotValidated: () => 'border-gray-300 dark:border-gray-600',
    onValidating: () => 'border-accent-300 dark:border-accent-600',
    onValid: () => 'border-gray-300 dark:border-gray-600',
    onInvalid: () => 'border-red-500 dark:border-red-400',
  })

const durationButtonClass = (
  isSelected: boolean,
  isDisabled: boolean,
): string =>
  clsx('flex-1 px-3 py-1.5 text-sm font-normal transition text-center', {
    'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900': isSelected,
    'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer':
      !isSelected && !isDisabled,
    'text-gray-300 dark:text-gray-600 cursor-not-allowed':
      !isSelected && isDisabled,
  })

export const view = NotePlayerDemoComposition.makeView((model, h) =>
  DemoView.shell(
    DemoView.codePanel(
      'note-demo-code-panel',
      'note-demo-phase',
      model.highlightPhase,
      notePlayerDemoCodeHtml,
    ),
    appPanel(model, h),
  ),
)

const appPanel = (model: Model, h: NotePlayerDemoViewBuilder): Html => {
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
              noteSequenceView(model.noteInput, model.playbackState),
              noteInputView(model.noteInput, isInputLocked, h),
              durationSelectorView(
                model.noteDurationRadioGroup,
                model.noteDuration,
                isInputLocked,
                h,
              ),
              playbackControlView(model.playbackState, model.audio, canPlay, h),
            ],
          ),
          DemoView.modelState([
            DemoView.modelStateField(
              'playbackState',
              playbackStateLabel(model.playbackState),
            ),
            DemoView.modelStateField('noteDuration', model.noteDuration),
            DemoView.modelStateField(
              'noteInput',
              noteInputLabel(model.noteInput),
            ),
          ]),
          phaseIndicatorView(model.highlightPhase),
          DemoView.eventLog(model.messageLog),
        ],
      ),
    ],
  )
}

const noteInputView = (
  noteInput: Model['noteInput'],
  isInputLocked: boolean,
  h: NotePlayerDemoViewBuilder,
): Html =>
  UiInput.view(
    {
      id: 'note-input',
      value: noteInput.value,
      onInput: value => Message.ChangedNoteInput({ value }),
      isDisabled: isInputLocked,
      isInvalid: noteInput._tag === 'Invalid',
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
                h.Class('text-xs text-gray-600 dark:text-gray-400'),
              ],
              ['Note Sequence'],
            ),
            h.input([
              ...attributes.input,
              h.Class(
                clsx(
                  'w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border text-sm text-gray-800 dark:text-gray-200 font-mono tracking-widest uppercase transition',
                  inputBorderClass(noteInput),
                ),
              ),
              h.Maxlength(MAX_NOTES),
              h.Autocomplete('off'),
            ]),
            FieldValidation.match(noteInput, {
              onNotValidated: () =>
                h.p(
                  [h.Class('text-xs text-gray-500 dark:text-gray-500')],
                  [`${MIN_NOTES}–${MAX_NOTES} notes, A through G`],
                ),
              onValidating: () =>
                h.p(
                  [h.Class('text-xs text-gray-500 dark:text-gray-500')],
                  [''],
                ),
              onValid: value =>
                h.p(
                  [h.Class('text-xs text-gray-600 dark:text-gray-400')],
                  [`${parseNotes(value).length} notes`],
                ),
              onInvalid: ({ errors }) =>
                h.p(
                  [h.Class('text-xs text-red-600 dark:text-red-400')],
                  [Array.headNonEmpty(errors)],
                ),
            }),
          ],
        ),
    },
    h,
  )

const noteDurations: ReadonlyArray<NoteDuration> = ['Short', 'Medium', 'Long']

const durationSelectorView = (
  noteDurationRadioGroup: Model['noteDurationRadioGroup'],
  noteDuration: NoteDuration,
  isInputLocked: boolean,
  h: NotePlayerDemoViewBuilder,
): Html =>
  h.div(
    [h.Class('flex flex-col gap-1.5')],
    [
      h.label(
        [h.Class('text-xs text-gray-600 dark:text-gray-400')],
        ['Note Length'],
      ),
      h.block(
        NoteDurationRadioGroupBinding.embedView({
          slotId: noteDurationRadioGroup.id,
          model: noteDurationRadioGroup,
          viewInputs: {
            selectedValue: Option.some(noteDuration),
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
                        durationButtonClass(
                          option.isSelected,
                          option.isDisabled,
                        ),
                      ),
                    ],
                    [option.value],
                  ),
                ),
              ),
          },
        }),
      ),
    ],
  )

const playbackControlView = (
  playbackState: PlaybackState,
  audio: AudioState,
  canPlay: boolean,
  h: NotePlayerDemoViewBuilder,
): Html => {
  const isPlaying = playbackState._tag === 'Playing'
  const isActive = isPlaying || playbackState._tag === 'Paused'

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
                          'button-accent flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm cursor-pointer',
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
                              'button-accent cursor-pointer': canPlay,
                              'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed':
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
                          'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed':
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
      ...audioUnavailableNoticeView(audio),
    ],
  )
}

const audioUnavailableNoticeView = (audio: AudioState): ReadonlyArray<Html> =>
  Match.value(audio).pipe(
    Match.withReturnType<ReadonlyArray<Html>>(),
    Match.tag('Unavailable', () => [
      ih.p(
        [ih.Class('text-xs text-amber-600 dark:text-amber-500')],
        ['No audio output in this browser, so playback stays silent.'],
      ),
    ]),
    Match.orElse(() => []),
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

const noteSequenceView = (
  noteInput: Model['noteInput'],
  playbackState: PlaybackState,
): Html => {
  const notes = parseNotes(noteInput.value)

  return ih.div(
    [
      ih.Class(
        'flex flex-col gap-2 pb-3 border-b border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      Array.match(notes, {
        onEmpty: () => placeholderVisualizerView(),
        onNonEmpty: validNotes => noteVisualizerView(playbackState, validNotes),
      }),
    ],
  )
}

const noteVisualizerView = (
  playbackState: PlaybackState,
  notes: ReadonlyArray<Note>,
): Html => {
  const maybeCurrentIndex = Match.value(playbackState).pipe(
    Match.tag('Playing', 'Paused', ({ currentNoteIndex }) =>
      Option.some(currentNoteIndex),
    ),
    Match.tag('Idle', () => Option.none()),
    Match.exhaustive,
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
                'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300':
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

const noteInputLabel = (noteInput: Model['noteInput']): string =>
  FieldValidation.match(noteInput, {
    onNotValidated: value => `NotValidated("${value}")`,
    onValidating: value => `Validating("${value}")`,
    onValid: value => `Valid("${value}")`,
    onInvalid: ({ errors }) => `Invalid("${Array.headNonEmpty(errors)}")`,
  })

const playbackStateLabel = (playbackState: PlaybackState): string =>
  PlaybackState.match(playbackState, {
    Idle: () => 'Idle',
    Playing: ({ currentNoteIndex, noteSequence }) =>
      `PlaybackState.Playing(${currentNoteIndex + 1}/${noteSequence.length})`,
    Paused: ({ currentNoteIndex, noteSequence }) =>
      `PlaybackState.Paused(${currentNoteIndex + 1}/${noteSequence.length})`,
  })

const phaseLabel = (phase: NoteHighlightPhase): string =>
  Match.value(phase).pipe(
    Match.when('Idle', () => 'Idle'),
    Match.whenOr('PlayMessage', 'PauseMessage', 'NoteMessage', () => 'Message'),
    Match.whenOr('PlayUpdate', 'NoteUpdate', () => 'Update'),
    Match.whenOr('PlayModel', 'NoteModel', () => 'Model'),
    Match.when('NoteCommand', () => 'Command'),
    Match.exhaustive,
  )

const phaseColorClass = (phase: NoteHighlightPhase): string =>
  Match.value(phase).pipe(
    Match.when('Idle', () => 'text-gray-600 dark:text-gray-400'),
    Match.whenOr(
      'PlayMessage',
      'PauseMessage',
      'NoteMessage',
      () => 'text-emerald-600 dark:text-emerald-400',
    ),
    Match.whenOr(
      'PlayUpdate',
      'NoteUpdate',
      () => 'text-amber-600 dark:text-amber-400',
    ),
    Match.whenOr(
      'PlayModel',
      'NoteModel',
      () => 'text-accent-700 dark:text-accent-400',
    ),
    Match.when('NoteCommand', () => 'text-violet-600 dark:text-violet-400'),
    Match.exhaustive,
  )

const phaseIndicatorView = (highlightPhase: NoteHighlightPhase): Html =>
  DemoView.phaseIndicator(
    phaseLabel(highlightPhase),
    phaseColorClass(highlightPhase),
    [],
  )

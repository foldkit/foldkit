import { clsx } from 'clsx'
import {
  Array,
  Duration,
  Effect,
  Match as M,
  Number as N,
  Schema as S,
  pipe,
} from 'effect'
import { Command, Task, Ui } from 'foldkit'
import { Html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import demoCodeHtml from 'virtual:counter-demo-code'

import {
  AriaHidden,
  AriaLabel,
  Class,
  For,
  Max,
  Min,
  Style,
  button,
  div,
  input,
  label,
  p,
} from '../html'
import type { Message as ParentMessage } from '../message'
import * as DemoView from './demoView'

// CONSTANTS

const PHASE_DURATION: Duration.DurationInput = '300 millis'
const MAX_LOG_ENTRIES = 50

// MODEL

const AnimationPhase = S.Literal(
  'Idle',
  'IncrementMessage',
  'IncrementUpdate',
  'IncrementModel',
  'ResetMessage',
  'ResetUpdate',
  'ResetCommand',
  'ResetCommandMessage',
  'ResetCommandUpdate',
  'ResetModel',
)

type AnimationPhase = typeof AnimationPhase.Type

export const Model = S.Struct({
  count: S.Number,
  isResetting: S.Boolean,
  resetDuration: S.Number,
  phase: AnimationPhase,
  generation: S.Number,
  messageLog: S.Array(S.String),
})

export type Model = typeof Model.Type

// MESSAGE

const ClickedDemoIncrement = m('ClickedDemoIncrement')
const ChangedDemoResetDuration = m('ChangedDemoResetDuration', {
  seconds: S.Number,
})
const ClickedDemoReset = m('ClickedDemoReset')
const ProgressedDemoPhase = m('ProgressedDemoPhase', {
  generation: S.Number,
})

export const Message = S.Union(
  ClickedDemoIncrement,
  ChangedDemoResetDuration,
  ClickedDemoReset,
  ProgressedDemoPhase,
)
export type Message = typeof Message.Type

// INIT

export const init = (): readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
] => [
  {
    count: 0,
    isResetting: false,
    resetDuration: 2,
    phase: 'Idle',
    generation: 0,
    messageLog: [],
  },
  [],
]

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const DelayAdvancePhase = Command.define(
  'DelayAdvancePhase',
  ProgressedDemoPhase,
)

const delayAdvancePhase = (
  generation: number,
  duration: Duration.DurationInput,
) =>
  DelayAdvancePhase(
    Task.delay(duration).pipe(Effect.as(ProgressedDemoPhase({ generation }))),
  )

const prependToLog =
  (entry: string) =>
  (messageLog: ReadonlyArray<string>): ReadonlyArray<string> =>
    pipe([entry, ...messageLog], Array.take(MAX_LOG_ENTRIES))

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedDemoIncrement: () => {
        const nextGeneration = model.generation + 1
        return [
          evo(model, {
            count: N.increment,
            isResetting: () => false,
            phase: () => 'IncrementMessage',
            generation: () => nextGeneration,
            messageLog: prependToLog('ClickedIncrement'),
          }),
          [delayAdvancePhase(nextGeneration, PHASE_DURATION)],
        ]
      },

      ChangedDemoResetDuration: ({ seconds }) => [
        evo(model, {
          resetDuration: () => seconds,
          messageLog: prependToLog(
            `ChangedResetDuration({ seconds: ${seconds} })`,
          ),
        }),
        [],
      ],

      ClickedDemoReset: () => {
        const nextGeneration = model.generation + 1
        return [
          evo(model, {
            isResetting: () => true,
            phase: () => 'ResetMessage',
            generation: () => nextGeneration,
            messageLog: prependToLog('ClickedReset'),
          }),
          [delayAdvancePhase(nextGeneration, PHASE_DURATION)],
        ]
      },

      ProgressedDemoPhase: ({ generation }) => {
        if (generation !== model.generation) {
          return [model, []]
        } else {
          return M.value(model.phase).pipe(
            withUpdateReturn,
            M.when('IncrementMessage', () => [
              evo(model, { phase: () => 'IncrementUpdate' }),
              [delayAdvancePhase(generation, PHASE_DURATION)],
            ]),
            M.when('IncrementUpdate', () => [
              evo(model, { phase: () => 'IncrementModel' }),
              [delayAdvancePhase(generation, PHASE_DURATION)],
            ]),
            M.when('IncrementModel', () => [
              evo(model, { phase: () => 'Idle' }),
              [],
            ]),
            M.when('ResetMessage', () => [
              evo(model, { phase: () => 'ResetUpdate' }),
              [delayAdvancePhase(generation, PHASE_DURATION)],
            ]),
            M.when('ResetUpdate', () => [
              evo(model, { phase: () => 'ResetCommand' }),
              [
                delayAdvancePhase(
                  generation,
                  `${N.clamp(model.resetDuration, { minimum: MIN_RESET_DURATION, maximum: MAX_RESET_DURATION })} seconds`,
                ),
              ],
            ]),
            M.when('ResetCommand', () => [
              evo(model, { phase: () => 'ResetCommandMessage' }),
              [delayAdvancePhase(generation, PHASE_DURATION)],
            ]),
            M.when('ResetCommandMessage', () => [
              evo(model, {
                phase: () => 'ResetCommandUpdate',
                messageLog: prependToLog('CompletedReset'),
              }),
              [delayAdvancePhase(generation, PHASE_DURATION)],
            ]),
            M.when('ResetCommandUpdate', () => [
              evo(model, {
                count: () => 0,
                isResetting: () => false,
                phase: () => 'ResetModel',
              }),
              [delayAdvancePhase(generation, PHASE_DURATION)],
            ]),
            M.when('ResetModel', () => [
              evo(model, { phase: () => 'Idle' }),
              [],
            ]),
            M.when('Idle', () => [model, []]),
            M.exhaustive,
          )
        }
      },
    }),
  )

// VIEW

const phaseLabel = (phase: AnimationPhase): string =>
  M.value(phase).pipe(
    M.when('Idle', () => 'Idle'),
    M.whenOr(
      'IncrementMessage',
      'ResetMessage',
      'ResetCommandMessage',
      () => 'Message',
    ),
    M.whenOr(
      'IncrementUpdate',
      'ResetUpdate',
      'ResetCommandUpdate',
      () => 'Update',
    ),
    M.whenOr('IncrementModel', 'ResetModel', () => 'Model'),
    M.when('ResetCommand', () => 'Command'),
    M.exhaustive,
  )

const phaseColorClass = (phase: AnimationPhase): string =>
  M.value(phase).pipe(
    M.when('Idle', () => 'text-gray-400 dark:text-gray-500'),
    M.whenOr(
      'IncrementMessage',
      'ResetMessage',
      'ResetCommandMessage',
      () => 'text-emerald-600 dark:text-emerald-400',
    ),
    M.whenOr(
      'IncrementUpdate',
      'ResetUpdate',
      'ResetCommandUpdate',
      () => 'text-amber-600 dark:text-amber-400',
    ),
    M.whenOr(
      'IncrementModel',
      'ResetModel',
      () => 'text-accent-600 dark:text-accent-400',
    ),
    M.when('ResetCommand', () => 'text-violet-600 dark:text-violet-400'),
    M.exhaustive,
  )

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  DemoView.demoViewShell(
    DemoView.codePanelView(
      'demo-code-panel',
      'demo-phase',
      model.phase,
      demoCodeHtml,
    ),
    appPanel(model, toParentMessage),
  )

const appPanel = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [Class('relative')],
    [
      div(
        [Class('lg:absolute lg:inset-0 flex flex-col gap-4 overflow-hidden')],
        [
          viewAndControlsView(model, toParentMessage),
          DemoView.modelStateView([
            DemoView.modelStateField('count', String(model.count)),
            DemoView.modelStateField('isResetting', String(model.isResetting)),
            DemoView.modelStateField(
              'resetDuration',
              String(model.resetDuration),
            ),
          ]),
          phaseIndicatorView(model),
          DemoView.eventLogView(model.messageLog),
        ],
      ),
    ],
  )

const MIN_RESET_DURATION = 1
const MAX_RESET_DURATION = 5

const stepperButtonClass = (isDisabled: boolean): string =>
  clsx('px-2.5 rounded-lg border text-sm font-normal transition', {
    'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed':
      isDisabled,
    'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer':
      !isDisabled,
  })

const parseResetDuration = (value: string): number =>
  N.clamp(Number(value), { minimum: 0, maximum: MAX_RESET_DURATION })

const viewAndControlsView = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html =>
  div(
    [Class('flex flex-col gap-3')],
    [
      div(
        [Class('pb-3 border-b border-gray-300 dark:border-gray-800')],
        [
          div(
            [
              Class(
                'flex items-center justify-center py-4 rounded-lg bg-gray-200 dark:bg-gray-800',
              ),
            ],
            [
              p(
                [
                  Class(
                    'text-3xl font-bold text-gray-800 dark:text-gray-200 font-mono',
                  ),
                ],
                [`${model.count}`],
              ),
            ],
          ),
        ],
      ),
      Ui.Button.view<ParentMessage>({
        onClick: toParentMessage(ClickedDemoIncrement()),
        toView: attributes =>
          button(
            [
              ...attributes.button,
              Class(
                'px-4 py-2 rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 text-sm font-normal transition hover:bg-accent-700 dark:hover:bg-accent-600 active:bg-accent-800 dark:active:bg-accent-700 cursor-pointer',
              ),
            ],
            ['Add 1'],
          ),
      }),
      Ui.Input.view<ParentMessage>({
        id: 'demo-reset-duration',
        value: String(model.resetDuration),
        onInput: value =>
          toParentMessage(
            ChangedDemoResetDuration({
              seconds: parseResetDuration(value),
            }),
          ),
        type: 'number',
        toView: attributes =>
          div(
            [Class('flex flex-col gap-1')],
            [
              label(
                [
                  ...attributes.label,
                  For('demo-reset-duration'),
                  Class('text-xs text-gray-500 dark:text-gray-400'),
                ],
                ['Reset Delay (seconds)'],
              ),
              div(
                [Class('flex gap-1')],
                [
                  input([
                    ...attributes.input,
                    Class(
                      'flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 font-mono',
                    ),
                    Min(String(MIN_RESET_DURATION)),
                    Max(String(MAX_RESET_DURATION)),
                  ]),
                  Ui.Button.view<ParentMessage>({
                    onClick: toParentMessage(
                      ChangedDemoResetDuration({
                        seconds: N.clamp(model.resetDuration - 1, {
                          minimum: MIN_RESET_DURATION,
                          maximum: MAX_RESET_DURATION,
                        }),
                      }),
                    ),
                    isDisabled: model.resetDuration <= MIN_RESET_DURATION,
                    toView: buttonAttributes =>
                      button(
                        [
                          ...buttonAttributes.button,
                          Class(
                            stepperButtonClass(
                              model.resetDuration <= MIN_RESET_DURATION,
                            ),
                          ),
                          AriaLabel('Decrease reset delay'),
                        ],
                        ['\u2212'],
                      ),
                  }),
                  Ui.Button.view<ParentMessage>({
                    onClick: toParentMessage(
                      ChangedDemoResetDuration({
                        seconds: N.clamp(model.resetDuration + 1, {
                          minimum: MIN_RESET_DURATION,
                          maximum: MAX_RESET_DURATION,
                        }),
                      }),
                    ),
                    isDisabled: model.resetDuration >= MAX_RESET_DURATION,
                    toView: buttonAttributes =>
                      button(
                        [
                          ...buttonAttributes.button,
                          Class(
                            stepperButtonClass(
                              model.resetDuration >= MAX_RESET_DURATION,
                            ),
                          ),
                          AriaLabel('Increase reset delay'),
                        ],
                        ['+'],
                      ),
                  }),
                ],
              ),
            ],
          ),
      }),
      Ui.Button.view<ParentMessage>({
        onClick: toParentMessage(ClickedDemoReset()),
        isDisabled: model.isResetting,
        toView: attributes =>
          button(
            [
              ...attributes.button,
              Class(
                clsx('px-4 py-2 rounded-lg text-sm font-normal transition', {
                  'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed':
                    model.isResetting,
                  'bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 hover:bg-accent-700 dark:hover:bg-accent-600 active:bg-accent-800 dark:active:bg-accent-700 cursor-pointer':
                    !model.isResetting,
                }),
              ),
            ],
            [
              model.isResetting
                ? 'Resetting...'
                : `Reset after ${model.resetDuration} seconds`,
            ],
          ),
      }),
    ],
  )

const phaseIndicatorView = (model: Model): Html => {
  const isCommand = model.phase === 'ResetCommand'

  return DemoView.phaseIndicatorView(
    phaseLabel(model.phase),
    phaseColorClass(model.phase),
    [progressBarView(model, isCommand)],
  )
}

const progressBarView = (model: Model, isCommand: boolean): Html =>
  div(
    [
      AriaHidden(true),
      Class(
        clsx(
          'flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden transition-opacity duration-200',
          {
            'opacity-100': isCommand,
            'opacity-0': !isCommand,
          },
        ),
      ),
    ],
    [
      div(
        [
          Class(
            clsx(
              'demo-progress-bar h-full rounded-full bg-violet-600 dark:bg-violet-400',
              {
                'demo-progress-bar-active': isCommand,
              },
            ),
          ),
          Style({
            '--reset-duration': String(model.resetDuration),
          }),
        ],
        [],
      ),
    ],
  )

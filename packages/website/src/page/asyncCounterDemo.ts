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
import { Command, Submodel, type Update } from 'foldkit'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import demoCodeHtml from 'virtual:counter-demo-code'

import { Button } from '@foldkit/ui'

import * as DemoView from './demoView'

// CONSTANTS

const PHASE_DURATION: Duration.Input = '300 millis'
const MAX_LOG_ENTRIES = 50
const MIN_RESET_DURATION = 1
const MAX_RESET_DURATION = 5

const clampResetSeconds = (seconds: number): number =>
  N.clamp(seconds, {
    minimum: MIN_RESET_DURATION,
    maximum: MAX_RESET_DURATION,
  })

// MODEL

const AnimationPhase = S.Literals([
  'Idle',
  'IncrementMessage',
  'IncrementUpdate',
  'IncrementModel',
  'DurationMessage',
  'DurationUpdate',
  'DurationModel',
  'ResetMessage',
  'ResetUpdate',
  'ResetCommand',
  'ResetCommandMessage',
  'ResetCommandUpdate',
  'ResetModel',
])

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

export const Message = defineMessageUnion({
  ClickedDemoIncrement: {},
  ChangedDemoResetDuration: { seconds: S.Number },
  ClickedDemoReset: {},
  CompletedDelayAdvancePhase: { generation: S.Number },
})

export type Message = typeof Message.Type

// INIT

export const init = (): Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}> => ({
  model: {
    count: 0,
    isResetting: false,
    resetDuration: 2,
    phase: 'Idle',
    generation: 0,
    messageLog: [],
  },
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const DelayAdvancePhase = Command.define('DelayAdvancePhase', {
  args: { generation: S.Number, duration: S.DurationFromMillis },
  messages: [Message.CompletedDelayAdvancePhase],
  execute: ({ generation, duration }) =>
    Effect.sleep(duration).pipe(
      Effect.as(Message.CompletedDelayAdvancePhase({ generation })),
    ),
})

const prependToLog =
  (entry: string) =>
  (messageLog: ReadonlyArray<string>): ReadonlyArray<string> =>
    pipe([entry, ...messageLog], Array.take(MAX_LOG_ENTRIES))

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedDemoIncrement: () => {
      const nextModel = evo(model, {
        count: N.increment,
        phase: () => 'IncrementMessage',
        generation: N.increment,
        messageLog: prependToLog('ClickedIncrement'),
      })
      return {
        model: nextModel,
        commands: [
          DelayAdvancePhase({
            generation: nextModel.generation,
            duration: Duration.fromInputUnsafe(PHASE_DURATION),
          }),
        ],
      }
    },

    ChangedDemoResetDuration: ({ seconds }) => {
      const nextModel = evo(model, {
        resetDuration: () => clampResetSeconds(seconds),
        phase: () => 'DurationMessage',
        generation: N.increment,
        messageLog: prependToLog(
          `ChangedResetDuration({ seconds: ${seconds} })`,
        ),
      })
      return {
        model: nextModel,
        commands: [
          DelayAdvancePhase({
            generation: nextModel.generation,
            duration: Duration.fromInputUnsafe(PHASE_DURATION),
          }),
        ],
      }
    },

    ClickedDemoReset: () => {
      const nextModel = evo(model, {
        isResetting: () => true,
        phase: () => 'ResetMessage',
        generation: N.increment,
        messageLog: prependToLog('ClickedResetAfterDelay'),
      })
      return {
        model: nextModel,
        commands: [
          DelayAdvancePhase({
            generation: nextModel.generation,
            duration: Duration.fromInputUnsafe(PHASE_DURATION),
          }),
        ],
      }
    },

    CompletedDelayAdvancePhase: ({ generation }) => {
      if (generation !== model.generation) {
        return { model }
      } else {
        return M.value(model.phase).pipe(
          withUpdateReturn,
          M.when('IncrementMessage', () => ({
            model: evo(model, { phase: () => 'IncrementUpdate' }),
            commands: [
              DelayAdvancePhase({
                generation,
                duration: Duration.fromInputUnsafe(PHASE_DURATION),
              }),
            ],
          })),
          M.when('IncrementUpdate', () => ({
            model: evo(model, { phase: () => 'IncrementModel' }),
            commands: [
              DelayAdvancePhase({
                generation,
                duration: Duration.fromInputUnsafe(PHASE_DURATION),
              }),
            ],
          })),
          M.when('IncrementModel', () => ({
            model: evo(model, { phase: () => 'Idle' }),
          })),
          M.when('DurationMessage', () => ({
            model: evo(model, { phase: () => 'DurationUpdate' }),
            commands: [
              DelayAdvancePhase({
                generation,
                duration: Duration.fromInputUnsafe(PHASE_DURATION),
              }),
            ],
          })),
          M.when('DurationUpdate', () => ({
            model: evo(model, { phase: () => 'DurationModel' }),
            commands: [
              DelayAdvancePhase({
                generation,
                duration: Duration.fromInputUnsafe(PHASE_DURATION),
              }),
            ],
          })),
          M.when('DurationModel', () => ({
            model: evo(model, { phase: () => 'Idle' }),
          })),
          M.when('ResetMessage', () => ({
            model: evo(model, { phase: () => 'ResetUpdate' }),
            commands: [
              DelayAdvancePhase({
                generation,
                duration: Duration.fromInputUnsafe(PHASE_DURATION),
              }),
            ],
          })),
          M.when('ResetUpdate', () => ({
            model: evo(model, { phase: () => 'ResetCommand' }),
            commands: [
              DelayAdvancePhase({
                generation,
                duration: Duration.fromInputUnsafe(
                  `${clampResetSeconds(model.resetDuration)} seconds`,
                ),
              }),
            ],
          })),
          M.when('ResetCommand', () => ({
            model: evo(model, { phase: () => 'ResetCommandMessage' }),
            commands: [
              DelayAdvancePhase({
                generation,
                duration: Duration.fromInputUnsafe(PHASE_DURATION),
              }),
            ],
          })),
          M.when('ResetCommandMessage', () => ({
            model: evo(model, {
              phase: () => 'ResetCommandUpdate',
              messageLog: prependToLog('CompletedDelayReset'),
            }),
            commands: [
              DelayAdvancePhase({
                generation,
                duration: Duration.fromInputUnsafe(PHASE_DURATION),
              }),
            ],
          })),
          M.when('ResetCommandUpdate', () => ({
            model: evo(model, {
              count: () => 0,
              isResetting: () => false,
              phase: () => 'ResetModel',
            }),
            commands: [
              DelayAdvancePhase({
                generation,
                duration: Duration.fromInputUnsafe(PHASE_DURATION),
              }),
            ],
          })),
          M.when('ResetModel', () => ({
            model: evo(model, { phase: () => 'Idle' }),
          })),
          M.when('Idle', () => ({ model })),
          M.exhaustive,
        )
      }
    },
  })

// VIEW

const phaseLabel = (phase: AnimationPhase): string =>
  M.value(phase).pipe(
    M.when('Idle', () => 'Idle'),
    M.whenOr(
      'IncrementMessage',
      'DurationMessage',
      'ResetMessage',
      'ResetCommandMessage',
      () => 'Message',
    ),
    M.whenOr(
      'IncrementUpdate',
      'DurationUpdate',
      'ResetUpdate',
      'ResetCommandUpdate',
      () => 'Update',
    ),
    M.whenOr('IncrementModel', 'DurationModel', 'ResetModel', () => 'Model'),
    M.when('ResetCommand', () => 'Command'),
    M.exhaustive,
  )

const phaseColorClass = (phase: AnimationPhase): string =>
  M.value(phase).pipe(
    M.when('Idle', () => 'text-gray-500 dark:text-gray-400'),
    M.whenOr(
      'IncrementMessage',
      'DurationMessage',
      'ResetMessage',
      'ResetCommandMessage',
      () => 'text-emerald-600 dark:text-emerald-400',
    ),
    M.whenOr(
      'IncrementUpdate',
      'DurationUpdate',
      'ResetUpdate',
      'ResetCommandUpdate',
      () => 'text-amber-600 dark:text-amber-400',
    ),
    M.whenOr(
      'IncrementModel',
      'DurationModel',
      'ResetModel',
      () => 'text-accent-600 dark:text-accent-400',
    ),
    M.when('ResetCommand', () => 'text-violet-600 dark:text-violet-400'),
    M.exhaustive,
  )

export const view = Submodel.defineView<Model, Message>(
  (model, h): Html =>
    DemoView.demoViewShell(
      DemoView.codePanelView(
        'demo-code-panel',
        'demo-phase',
        model.phase,
        demoCodeHtml,
      ),
      appPanel(model, h),
    ),
)

const appPanel = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('relative')],
    [
      h.div(
        [h.Class('lg:absolute lg:inset-0 flex flex-col gap-4 overflow-hidden')],
        [
          viewAndControlsView(model, h),
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

const actionButtonClass = (isDisabled: boolean): string =>
  clsx('px-4 py-2 rounded-lg text-sm font-normal transition', {
    'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed': isDisabled,
    'bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 hover:bg-accent-700 dark:hover:bg-accent-600 active:bg-accent-800 dark:active:bg-accent-700 cursor-pointer':
      !isDisabled,
  })

const stepperButtonClass = (isDisabled: boolean): string =>
  clsx('px-2.5 rounded-lg border text-sm font-normal transition', {
    'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed':
      isDisabled,
    'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer':
      !isDisabled,
  })

const RESET_DELAY_LABEL_ID = 'demo-reset-delay-label'

const resetButtonLabel = (model: Model): string => {
  if (model.isResetting) {
    return 'Resetting...'
  } else {
    const unit = model.resetDuration === 1 ? 'second' : 'seconds'
    return `Reset after ${model.resetDuration} ${unit}`
  }
}

const stepperButton = (
  model: Model,
  label: string,
  symbol: string,
  delta: number,
  h: HtmlBuilder<Message>,
): Html => {
  const nextSeconds = clampResetSeconds(model.resetDuration + delta)
  const isDisabled = model.isResetting || nextSeconds === model.resetDuration

  return Button.view(
    {
      onClick: Message.ChangedDemoResetDuration({ seconds: nextSeconds }),
      isDisabled,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class(stepperButtonClass(isDisabled)),
            h.AriaLabel(label),
          ],
          [symbol],
        ),
    },
    h,
  )
}

const viewAndControlsView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('flex flex-col gap-3')],
    [
      h.div(
        [h.Class('pb-3 border-b border-gray-300 dark:border-gray-800')],
        [
          h.div(
            [
              h.Class(
                'flex items-center justify-center py-4 rounded-lg bg-gray-200 dark:bg-gray-800',
              ),
            ],
            [
              h.p(
                [
                  h.Class(
                    'text-3xl font-bold text-gray-800 dark:text-gray-200 font-mono',
                  ),
                ],
                [`${model.count}`],
              ),
            ],
          ),
        ],
      ),
      Button.view(
        {
          onClick: Message.ClickedDemoIncrement(),
          isDisabled: model.isResetting,
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(actionButtonClass(model.isResetting)),
              ],
              ['Add 1'],
            ),
        },
        h,
      ),
      h.div(
        [h.Class('flex flex-col gap-1')],
        [
          h.p(
            [
              h.Id(RESET_DELAY_LABEL_ID),
              h.Class('text-xs text-gray-500 dark:text-gray-400'),
            ],
            ['Reset Delay (seconds)'],
          ),
          h.div(
            [
              h.Class('flex gap-1'),
              h.Role('group'),
              h.AriaLabelledBy(RESET_DELAY_LABEL_ID),
            ],
            [
              stepperButton(model, 'Decrease reset delay', '\u2212', -1, h),
              h.p(
                [
                  h.AriaLive('polite'),
                  h.Class(
                    clsx(
                      'flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-mono text-center',
                      {
                        'text-gray-400 dark:text-gray-600': model.isResetting,
                        'text-gray-800 dark:text-gray-200': !model.isResetting,
                      },
                    ),
                  ),
                ],
                [String(model.resetDuration)],
              ),
              stepperButton(model, 'Increase reset delay', '+', 1, h),
            ],
          ),
        ],
      ),
      Button.view(
        {
          onClick: Message.ClickedDemoReset(),
          isDisabled: model.isResetting,
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(actionButtonClass(model.isResetting)),
              ],
              [resetButtonLabel(model)],
            ),
        },
        h,
      ),
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
  ih.div(
    [
      ih.AriaHidden(true),
      ih.Class(
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
      ih.div([
        ih.Class(
          clsx(
            'demo-progress-bar h-full rounded-full bg-violet-600 dark:bg-violet-400',
            {
              'demo-progress-bar-active': isCommand,
            },
          ),
        ),
        ih.Style({
          '--reset-duration': String(clampResetSeconds(model.resetDuration)),
        }),
      ]),
    ],
  )

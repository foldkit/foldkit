import { clsx } from 'clsx'
import { Match } from 'effect'
import { type Html, inertHtml as ih } from 'foldkit/html'
import demoCodeHtml from 'virtual:counter-demo-code'

import { Button } from '@foldkit/ui'

import * as DemoView from '../../../view/demo'
import { type AnimationPhase, Message, type Model } from '../block'
import {
  AsyncCounterDemoComposition,
  type AsyncCounterDemoViewBuilder,
} from '../composition'
import { clampResetSeconds } from '../resetDuration'

const phaseLabel = (phase: AnimationPhase): string =>
  Match.value(phase).pipe(
    Match.when('Idle', () => 'Idle'),
    Match.whenOr(
      'IncrementMessage',
      'DurationMessage',
      'ResetMessage',
      'ResetCommandMessage',
      () => 'Message',
    ),
    Match.whenOr(
      'IncrementUpdate',
      'DurationUpdate',
      'ResetUpdate',
      'ResetCommandUpdate',
      () => 'Update',
    ),
    Match.whenOr(
      'IncrementModel',
      'DurationModel',
      'ResetModel',
      () => 'Model',
    ),
    Match.when('ResetCommand', () => 'Command'),
    Match.exhaustive,
  )

const phaseColorClass = (phase: AnimationPhase): string =>
  Match.value(phase).pipe(
    Match.when('Idle', () => 'text-gray-600 dark:text-gray-400'),
    Match.whenOr(
      'IncrementMessage',
      'DurationMessage',
      'ResetMessage',
      'ResetCommandMessage',
      () => 'text-emerald-600 dark:text-emerald-400',
    ),
    Match.whenOr(
      'IncrementUpdate',
      'DurationUpdate',
      'ResetUpdate',
      'ResetCommandUpdate',
      () => 'text-amber-600 dark:text-amber-400',
    ),
    Match.whenOr(
      'IncrementModel',
      'DurationModel',
      'ResetModel',
      () => 'text-accent-700 dark:text-accent-400',
    ),
    Match.when('ResetCommand', () => 'text-violet-600 dark:text-violet-400'),
    Match.exhaustive,
  )

export const view = AsyncCounterDemoComposition.makeView((model, h) =>
  DemoView.shell(
    DemoView.codePanel(
      'demo-code-panel',
      'demo-phase',
      model.phase,
      demoCodeHtml,
    ),
    appPanel(model, h),
  ),
)

const appPanel = (model: Model, h: AsyncCounterDemoViewBuilder): Html =>
  h.div(
    [h.Class('relative')],
    [
      h.div(
        [h.Class('lg:absolute lg:inset-0 flex flex-col gap-4 overflow-hidden')],
        [
          viewAndControlsView(model, h),
          DemoView.modelState([
            DemoView.modelStateField('count', String(model.count)),
            DemoView.modelStateField('isResetting', String(model.isResetting)),
            DemoView.modelStateField(
              'resetDuration',
              String(model.resetDuration),
            ),
          ]),
          phaseIndicatorView(model.phase, model.resetDuration),
          DemoView.eventLog(model.messageLog),
        ],
      ),
    ],
  )

const actionButtonClass = (isDisabled: boolean): string =>
  clsx('px-4 py-2 rounded-lg text-sm font-normal transition', {
    'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed': isDisabled,
    'button-accent cursor-pointer': !isDisabled,
  })

const stepperButtonClass = (isDisabled: boolean): string =>
  clsx('px-2.5 rounded-lg border text-sm font-normal transition', {
    'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed':
      isDisabled,
    'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer':
      !isDisabled,
  })

const RESET_DELAY_LABEL_ID = 'demo-reset-delay-label'

const resetButtonLabel = (
  isResetting: boolean,
  resetDuration: number,
): string => {
  if (isResetting) {
    return 'Resetting...'
  } else {
    const unit = resetDuration === 1 ? 'second' : 'seconds'
    return `Reset after ${resetDuration} ${unit}`
  }
}

const stepperButton = (
  resetDuration: number,
  isResetting: boolean,
  label: string,
  symbol: string,
  delta: number,
  h: AsyncCounterDemoViewBuilder,
): Html => {
  const nextSeconds = clampResetSeconds(resetDuration + delta)
  const isDisabled = isResetting || nextSeconds === resetDuration

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

const viewAndControlsView = (
  model: Model,
  h: AsyncCounterDemoViewBuilder,
): Html =>
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
              h.Class('text-xs text-gray-600 dark:text-gray-400'),
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
              stepperButton(
                model.resetDuration,
                model.isResetting,
                'Decrease reset delay',
                '\u2212',
                -1,
                h,
              ),
              h.p(
                [
                  h.AriaLive('polite'),
                  h.Class(
                    clsx(
                      'flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-mono text-center',
                      {
                        'text-gray-500 dark:text-gray-600': model.isResetting,
                        'text-gray-800 dark:text-gray-200': !model.isResetting,
                      },
                    ),
                  ),
                ],
                [String(model.resetDuration)],
              ),
              stepperButton(
                model.resetDuration,
                model.isResetting,
                'Increase reset delay',
                '+',
                1,
                h,
              ),
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
              [resetButtonLabel(model.isResetting, model.resetDuration)],
            ),
        },
        h,
      ),
    ],
  )

const phaseIndicatorView = (
  phase: AnimationPhase,
  resetDuration: number,
): Html => {
  const isCommand = phase === 'ResetCommand'

  return DemoView.phaseIndicator(phaseLabel(phase), phaseColorClass(phase), [
    progressBarView(resetDuration, isCommand),
  ])
}

const progressBarView = (resetDuration: number, isCommand: boolean): Html =>
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
          '--reset-duration': String(clampResetSeconds(resetDuration)),
        }),
      ]),
    ],
  )

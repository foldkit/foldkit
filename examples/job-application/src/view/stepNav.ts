import clsx from 'clsx'
import {
  Array,
  Equal,
  HashSet,
  Match,
  Number,
  Option,
  flow,
  pipe,
} from 'effect'
import { Ui } from 'foldkit'
import { type Html } from 'foldkit/html'

import { Step } from '../domain'
import {
  AriaCurrent,
  AriaDisabled,
  AriaLabel,
  Class,
  OnClick,
  Type,
  button,
  div,
  keyed,
  nav,
  span,
  ul,
} from '../html'
import type { Message } from '../message'
import { type Model } from '../model'
import { chevronDown } from './icon'

type StepStatus = 'Current' | 'Completed' | 'Upcoming'

const stepToStatus = (step: Step.Step, currentStep: Step.Step): StepStatus =>
  Match.value(step).pipe(
    Match.withReturnType<StepStatus>(),
    Match.when(Equal.equals(currentStep), () => 'Current'),
    Match.when(
      flow(Step.indexOf, Number.isLessThan(Step.indexOf(currentStep))),
      () => 'Completed',
    ),
    Match.orElse(() => 'Upcoming'),
  )

const isClickable = (status: StepStatus, hasErrors: boolean): boolean =>
  status !== 'Upcoming' || hasErrors

const stepMarkerGlyph = (
  status: StepStatus,
  index: number,
  hasErrors: boolean,
): string => {
  if (hasErrors) {
    return '!'
  } else if (status === 'Completed') {
    return '\u2713'
  } else {
    return String(Number.increment(index))
  }
}

const stepMarker = (
  status: StepStatus,
  index: number,
  hasErrors: boolean,
): Html =>
  span(
    [
      Class(
        clsx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          hasErrors
            ? 'bg-red-100 text-red-700'
            : Match.value(status).pipe(
                Match.withReturnType<string>(),
                Match.when('Current', () => 'bg-indigo-600 text-white'),
                Match.when('Completed', () => 'bg-indigo-100 text-indigo-700'),
                Match.when('Upcoming', () => 'bg-gray-100 text-gray-400'),
                Match.exhaustive,
              ),
        ),
      ),
    ],
    [stepMarkerGlyph(status, index, hasErrors)],
  )

const stepButtonClass = (status: StepStatus, hasErrors: boolean): string =>
  clsx(
    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
    hasErrors
      ? 'text-red-700 hover:bg-red-50 cursor-pointer'
      : Match.value(status).pipe(
          Match.withReturnType<string>(),
          Match.when('Current', () => 'bg-indigo-50 text-indigo-700'),
          Match.when(
            'Completed',
            () => 'text-gray-700 hover:bg-gray-100 cursor-pointer',
          ),
          Match.when('Upcoming', () => 'text-gray-400 cursor-default'),
          Match.exhaustive,
        ),
  )

export const stepList = (
  currentStep: Step.Step,
  stepsWithErrors: HashSet.HashSet<Step.Step>,
  onSelectedStep: (step: Step.Step) => Message,
): Html =>
  nav(
    [AriaLabel('Application steps'), Class('space-y-1')],
    [
      ul(
        [Class('space-y-0.5')],
        Step.all.map((step, index) => {
          const status = stepToStatus(step, currentStep)
          const hasErrors = HashSet.has(stepsWithErrors, step)
          const clickable = isClickable(status, hasErrors)

          return keyed('li')(
            step,
            [],
            [
              button(
                [
                  Type('button'),
                  ...(status === 'Current' ? [AriaCurrent('step')] : []),
                  ...(clickable
                    ? [OnClick(onSelectedStep(step))]
                    : [AriaDisabled(true)]),
                  Class(stepButtonClass(status, hasErrors)),
                ],
                [
                  stepMarker(status, index, hasErrors),
                  span([], [Step.show(step)]),
                ],
              ),
            ],
          )
        }),
      ),
    ],
  )

const stepMenuTrigger = (currentStep: Step.Step): Html =>
  div(
    [Class('flex items-center justify-between w-full gap-3')],
    [
      div(
        [Class('flex items-center gap-2 min-w-0')],
        [
          span(
            [Class('text-xs font-medium text-gray-500 shrink-0')],
            [
              `Step ${Number.increment(Step.indexOf(currentStep))} of ${Step.all.length}`,
            ],
          ),
          span(
            [Class('text-sm font-semibold text-gray-900 truncate')],
            [Step.show(currentStep)],
          ),
        ],
      ),
      span([Class('text-gray-400 shrink-0')], [chevronDown()]),
    ],
  )

export const stepMenu = (
  model: Model,
  stepsWithErrors: HashSet.HashSet<Step.Step>,
  toParentMessage: (message: Ui.Menu.Message) => Message,
  onSelectedStep: (step: Step.Step) => Message,
): Html =>
  Ui.Menu.view<Message, Step.Step>({
    model: model.stepMenu,
    toParentMessage,
    items: Step.all,
    onSelectedItem: index =>
      onSelectedStep(
        pipe(
          Step.all,
          Array.get(index),
          Option.getOrElse(() => model.currentStep),
        ),
      ),
    buttonContent: stepMenuTrigger(model.currentStep),
    buttonClassName:
      'flex items-center w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 cursor-pointer',
    itemsClassName:
      'rounded-lg border border-gray-200 bg-white shadow-lg py-1 w-(--button-width)',
    itemToConfig: (step, { isActive, isDisabled }) => {
      const status = stepToStatus(step, model.currentStep)
      const hasErrors = HashSet.has(stepsWithErrors, step)
      const index = Step.indexOf(step)
      return {
        className: clsx(
          'flex items-center gap-3 px-4 py-2.5 text-sm',
          isActive && 'bg-gray-50',
          isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
          hasErrors
            ? 'text-red-700 font-semibold'
            : Match.value(status).pipe(
                Match.withReturnType<string>(),
                Match.when('Current', () => 'text-indigo-700 font-semibold'),
                Match.when('Completed', () => 'text-gray-700'),
                Match.when('Upcoming', () => 'text-gray-400'),
                Match.exhaustive,
              ),
        ),
        content: div(
          [Class('flex items-center gap-3')],
          [stepMarker(status, index, hasErrors), span([], [Step.show(step)])],
        ),
      }
    },
    isItemDisabled: step =>
      !isClickable(
        stepToStatus(step, model.currentStep),
        HashSet.has(stepsWithErrors, step),
      ),
    backdropClassName: 'fixed inset-0',
    anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
  })

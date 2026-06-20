import clsx from 'clsx'
import { Equal, HashSet, Match, Number, flow } from 'effect'
import { type Html, html } from 'foldkit/html'

import { Menu, Tabs } from '@foldkit/ui'

import { Step } from '../domain'
import type { Message } from '../message'
import { type Model } from '../model'
import { chevronDown } from './icon'

const StepMenu = Menu.create<Step.Step>()

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

const stepMarkerGlyph = (
  status: StepStatus,
  index: number,
  needsAttention: boolean,
): string => {
  if (needsAttention) {
    return '!'
  } else if (status === 'Completed') {
    return '✓'
  } else {
    return String(Number.increment(index))
  }
}

const stepMarker = (
  status: StepStatus,
  index: number,
  needsAttention: boolean,
): Html => {
  const h = html()

  return h.span(
    [
      h.Class(
        clsx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          needsAttention
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
    [stepMarkerGlyph(status, index, needsAttention)],
  )
}

const stepButtonClass = (status: StepStatus, needsAttention: boolean): string =>
  clsx(
    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
    needsAttention
      ? 'text-red-700 hover:bg-red-50 cursor-pointer'
      : Match.value(status).pipe(
          Match.withReturnType<string>(),
          Match.when('Current', () => 'bg-indigo-50 text-indigo-700'),
          Match.when(
            'Completed',
            () => 'text-gray-700 hover:bg-gray-100 cursor-pointer',
          ),
          Match.when(
            'Upcoming',
            () => 'text-gray-600 hover:bg-gray-100 cursor-pointer',
          ),
          Match.exhaustive,
        ),
  )

export const stepTabButton = (
  tab: Tabs.TabInfo<Step.Step>,
  currentStep: Step.Step,
  stepsNeedingAttention: HashSet.HashSet<Step.Step>,
): Html => {
  const h = html<Message>()
  const status = stepToStatus(tab.value, currentStep)
  const needsAttention = HashSet.has(stepsNeedingAttention, tab.value)

  return h.keyed('button')(
    tab.value,
    [...tab.tab, h.Class(stepButtonClass(status, needsAttention))],
    [
      stepMarker(status, tab.index, needsAttention),
      h.span([], [Step.show(tab.value)]),
    ],
  )
}

const stepMenuTrigger = (currentStep: Step.Step): Html => {
  const h = html()

  return h.div(
    [h.Class('flex items-center justify-between w-full gap-3')],
    [
      h.div(
        [h.Class('flex items-center gap-2 min-w-0')],
        [
          h.span(
            [h.Class('text-xs font-medium text-gray-500 shrink-0')],
            [
              `Step ${Number.increment(Step.indexOf(currentStep))} of ${Step.all.length}`,
            ],
          ),
          h.span(
            [h.Class('text-sm font-semibold text-gray-900 truncate')],
            [Step.show(currentStep)],
          ),
        ],
      ),
      h.span([h.Class('text-gray-400 shrink-0')], [chevronDown()]),
    ],
  )
}

export const stepMenu = (
  model: Model,
  stepsNeedingAttention: HashSet.HashSet<Step.Step>,
  toParentMessage: (message: Menu.Message) => Message,
): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId: model.stepMenu.id,
    model: model.stepMenu,
    view: StepMenu.view,
    viewInputs: {
      items: Step.all,
      buttonContent: stepMenuTrigger(model.currentStep),
      buttonClassName:
        'flex items-center w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 cursor-pointer',
      itemsClassName:
        'rounded-lg border border-gray-200 bg-white shadow-lg py-1 w-(--button-width)',
      itemToConfig: (step, { isActive }) => {
        const status = stepToStatus(step, model.currentStep)
        const needsAttention = HashSet.has(stepsNeedingAttention, step)
        const index = Step.indexOf(step)
        return {
          className: clsx(
            'flex items-center gap-3 px-4 py-2.5 text-sm',
            isActive && 'bg-gray-50',
            'cursor-pointer',
            needsAttention
              ? 'text-red-700 font-semibold'
              : Match.value(status).pipe(
                  Match.withReturnType<string>(),
                  Match.when('Current', () => 'text-indigo-700 font-semibold'),
                  Match.when('Completed', () => 'text-gray-700'),
                  Match.when('Upcoming', () => 'text-gray-600'),
                  Match.exhaustive,
                ),
          ),
          content: h.div(
            [h.Class('flex items-center gap-3')],
            [
              stepMarker(status, index, needsAttention),
              h.span([], [Step.show(step)]),
            ],
          ),
        }
      },
      backdropClassName: 'fixed inset-0',
      anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
    },
    toParentMessage,
  })
}

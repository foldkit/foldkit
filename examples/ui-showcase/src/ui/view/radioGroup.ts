import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import {
  GotHorizontalRadioGroupDemoMessage,
  GotVerticalRadioGroupDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

type Plan = 'Startup' | 'Business' | 'Enterprise'

const plans: ReadonlyArray<Plan> = ['Startup', 'Business', 'Enterprise']

export const PlanRadioGroup = Ui.RadioGroup.create<Plan>()

const planDescriptions: Record<Plan, string> = {
  Startup: '12GB / 6 CPUs. Perfect for small projects',
  Business: '16GB / 8 CPUs. For growing teams',
  Enterprise: '32GB / 12 CPUs. Dedicated infrastructure',
}

const planPrices: Record<Plan, string> = {
  Startup: '$40/mo',
  Business: '$80/mo',
  Enterprise: '$160/mo',
}

const verticalGroupClassName = 'flex flex-col gap-3 w-full'

const verticalOptionClassName =
  'relative flex cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 data-[checked]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2'

const horizontalGroupClassName = 'flex flex-col sm:flex-row gap-3 w-full'

const horizontalOptionClassName =
  'relative flex flex-1 cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 data-[checked]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2'

const labelClassName = 'text-sm font-medium text-gray-900'

const descriptionClassName = 'text-sm text-gray-600'

const priceClassName = 'text-sm font-semibold text-accent-600'

const checkIcon = (): Html => {
  const h = html()

  return h.svg(
    [h.ViewBox('0 0 24 24'), h.Fill('none'), h.Class('size-5 text-accent-600')],
    [
      h.path(
        [
          h.D('M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
          h.Stroke('currentColor'),
          h.StrokeWidth('1.5'),
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
        ],
        [],
      ),
    ],
  )
}

const checkPlaceholder = (): Html => {
  const h = html()

  return h.div([h.Class('size-5')], [])
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Radio Group']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Vertical'],
      ),
      h.submodel({
        slotId: 'vertical-radio-group-demo',
        model: model.verticalRadioGroupDemo,
        view: PlanRadioGroup.view,
        viewInputs: {
          options: plans,
          ariaLabel: 'Server plan',
          toView: ({ group, options }) =>
            h.div(
              [...group, h.Class(verticalGroupClassName)],
              options.map(option => {
                const plan = option.value
                return h.div(
                  [...option.option, h.Class(verticalOptionClassName)],
                  [
                    h.div(
                      [h.Class('flex w-full items-center justify-between')],
                      [
                        h.div(
                          [],
                          [
                            h.span(
                              [...option.label, h.Class(labelClassName)],
                              [plan],
                            ),
                            h.p(
                              [
                                ...option.description,
                                h.Class(descriptionClassName),
                              ],
                              [planDescriptions[plan]],
                            ),
                          ],
                        ),
                        h.div(
                          [h.Class('flex items-center gap-3')],
                          [
                            h.span(
                              [h.Class(priceClassName)],
                              [planPrices[plan]],
                            ),
                            option.isSelected
                              ? checkIcon()
                              : checkPlaceholder(),
                          ],
                        ),
                      ],
                    ),
                  ],
                )
              }),
            ),
        },
        toParentMessage: message =>
          GotVerticalRadioGroupDemoMessage({ message }),
      }),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Horizontal'],
      ),
      h.submodel({
        slotId: 'horizontal-radio-group-demo',
        model: model.horizontalRadioGroupDemo,
        view: PlanRadioGroup.view,
        viewInputs: {
          options: plans,
          ariaLabel: 'Server plan',
          orientation: 'Horizontal',
          toView: ({ group, options }) =>
            h.div(
              [...group, h.Class(horizontalGroupClassName)],
              options.map(option => {
                const plan = option.value
                return h.div(
                  [...option.option, h.Class(horizontalOptionClassName)],
                  [
                    h.div(
                      [h.Class('flex w-full items-center justify-between')],
                      [
                        h.div(
                          [],
                          [
                            h.span(
                              [...option.label, h.Class(labelClassName)],
                              [plan],
                            ),
                            h.p(
                              [
                                ...option.description,
                                h.Class(descriptionClassName),
                              ],
                              [planDescriptions[plan]],
                            ),
                          ],
                        ),
                        option.isSelected ? checkIcon() : checkPlaceholder(),
                      ],
                    ),
                    h.span(
                      [h.Class(priceClassName + ' mt-2')],
                      [planPrices[plan]],
                    ),
                  ],
                )
              }),
            ),
        },
        toParentMessage: message =>
          GotHorizontalRadioGroupDemoMessage({ message }),
      }),
    ],
  )
})

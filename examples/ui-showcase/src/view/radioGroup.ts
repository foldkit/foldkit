import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import {
  Class,
  D,
  Fill,
  Stroke,
  StrokeLinecap,
  StrokeLinejoin,
  StrokeWidth,
  ViewBox,
  div,
  h2,
  h3,
  p,
  path,
  span,
  svg,
} from '../html'
import type { Message as ParentMessage } from '../main'
import {
  GotHorizontalRadioGroupDemoMessage,
  GotVerticalRadioGroupDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

type Plan = 'Startup' | 'Business' | 'Enterprise'

const plans: ReadonlyArray<Plan> = ['Startup', 'Business', 'Enterprise']

const planDescriptions: Record<Plan, string> = {
  Startup: '12GB / 6 CPUs — Perfect for small projects',
  Business: '16GB / 8 CPUs — For growing teams',
  Enterprise: '32GB / 12 CPUs — Dedicated infrastructure',
}

const planPrices: Record<Plan, string> = {
  Startup: '$40/mo',
  Business: '$80/mo',
  Enterprise: '$160/mo',
}

const verticalGroupClassName = 'flex flex-col gap-3 w-full'

const verticalOptionClassName =
  'relative flex cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 data-[checked]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2'

const horizontalGroupClassName = 'flex flex-row gap-3 w-full'

const horizontalOptionClassName =
  'relative flex flex-1 cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 data-[checked]:border-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2'

const labelClassName = 'text-sm font-medium text-gray-900'

const descriptionClassName = 'text-sm text-gray-600'

const priceClassName = 'text-sm font-semibold text-accent-600'

const checkIcon = svg(
  [ViewBox('0 0 24 24'), Fill('none'), Class('size-5 text-accent-600')],
  [
    path(
      [
        D('M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
        Stroke('currentColor'),
        StrokeWidth('1.5'),
        StrokeLinecap('round'),
        StrokeLinejoin('round'),
      ],
      [],
    ),
  ],
)

const checkPlaceholder = div([Class('size-5')], [])

export const view = (
  model: UiModel,
  toMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Radio Group']),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Vertical'],
      ),
      Ui.RadioGroup.view<ParentMessage, Plan>({
        model: model.verticalRadioGroupDemo,
        toMessage: message =>
          toMessage(GotVerticalRadioGroupDemoMessage({ message })),
        options: plans,
        optionToConfig: (plan, { isSelected }) => ({
          value: plan,
          content: attributes =>
            div(
              [...attributes.option, Class(verticalOptionClassName)],
              [
                div(
                  [Class('flex w-full items-center justify-between')],
                  [
                    div(
                      [],
                      [
                        span(
                          [...attributes.label, Class(labelClassName)],
                          [plan],
                        ),
                        p(
                          [
                            ...attributes.description,
                            Class(descriptionClassName),
                          ],
                          [planDescriptions[plan]],
                        ),
                      ],
                    ),
                    div(
                      [Class('flex items-center gap-3')],
                      [
                        span([Class(priceClassName)], [planPrices[plan]]),
                        isSelected ? checkIcon : checkPlaceholder,
                      ],
                    ),
                  ],
                ),
              ],
            ),
        }),
        className: verticalGroupClassName,
      }),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Horizontal'],
      ),
      Ui.RadioGroup.view<ParentMessage, Plan>({
        model: model.horizontalRadioGroupDemo,
        toMessage: message =>
          toMessage(GotHorizontalRadioGroupDemoMessage({ message })),
        options: plans,
        optionToConfig: (plan, { isSelected }) => ({
          value: plan,
          content: attributes =>
            div(
              [...attributes.option, Class(horizontalOptionClassName)],
              [
                div(
                  [Class('flex w-full items-center justify-between')],
                  [
                    div(
                      [],
                      [
                        span(
                          [...attributes.label, Class(labelClassName)],
                          [plan],
                        ),
                        p(
                          [
                            ...attributes.description,
                            Class(descriptionClassName),
                          ],
                          [planDescriptions[plan]],
                        ),
                      ],
                    ),
                    isSelected ? checkIcon : checkPlaceholder,
                  ],
                ),
                span([Class(priceClassName + ' mt-2')], [planPrices[plan]]),
              ],
            ),
        }),
        orientation: 'Horizontal',
        className: horizontalGroupClassName,
      }),
    ],
  )

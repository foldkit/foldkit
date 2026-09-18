import type { HtmlBuilder } from 'foldkit/html'

import { Meter } from '@foldkit/ui'

import { Message } from './message'

// DEMO CONTENT

const trackClassName =
  'h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden'

const fillClassName = 'h-full rounded-full bg-emerald-600 transition-all'

// VIEW

export const basicDemo = (h: HtmlBuilder<Message>) => {
  return [
    Meter.view(
      {
        id: 'meter-basic-demo',
        value: 75,
        max: 100,
        ariaLabel: 'Health',
        valueText: '75 of 100 health',
        toView: attributes =>
          h.div(
            [h.Class('flex flex-col gap-2 w-full max-w-sm')],
            [
              h.div(
                [h.Class('flex items-center justify-between text-sm')],
                [
                  h.span(
                    [
                      ...attributes.label,
                      h.Class('font-medium text-gray-900 dark:text-white'),
                    ],
                    ['Health'],
                  ),
                  h.span(
                    [h.Class('tabular-nums text-gray-600 dark:text-gray-400')],
                    ['75 / 100'],
                  ),
                ],
              ),
              h.div(
                [...attributes.meter, h.Class(trackClassName)],
                [h.div([...attributes.fill, h.Class(fillClassName)])],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

export const thresholdsDemo = (h: HtmlBuilder<Message>) => {
  return [
    Meter.view(
      {
        id: 'meter-thresholds-demo',
        value: 25,
        min: 0,
        max: 100,
        low: 30,
        high: 80,
        optimum: 90,
        ariaLabel: 'Storage',
        valueText: '25 of 100 used',
        toView: attributes =>
          h.div(
            [h.Class('flex flex-col gap-2 w-full max-w-sm')],
            [
              h.div(
                [h.Class('flex items-center justify-between text-sm')],
                [
                  h.span(
                    [
                      ...attributes.label,
                      h.Class('font-medium text-gray-900 dark:text-white'),
                    ],
                    ['Storage'],
                  ),
                  h.span(
                    [h.Class('tabular-nums text-gray-600 dark:text-gray-400')],
                    ['25%'],
                  ),
                ],
              ),
              h.div(
                [...attributes.meter, h.Class(trackClassName)],
                [h.div([...attributes.fill, h.Class(fillClassName)])],
              ),
              h.span(
                [h.Class('text-xs text-gray-500 dark:text-gray-400')],
                ['low 30, high 80, optimum 90 as data attributes'],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

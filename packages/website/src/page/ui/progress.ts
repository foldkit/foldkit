import type { HtmlBuilder } from 'foldkit/html'

import { Progress } from '@foldkit/ui'

import { Message } from './message'

// DEMO CONTENT

const trackClassName =
  'h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden'

const indicatorClassName = 'h-full rounded-full bg-blue-600 transition-all'

// VIEW

export const basicDemo = (h: HtmlBuilder<Message>) => {
  return [
    Progress.view(
      {
        id: 'progress-basic-demo',
        value: 42,
        max: 100,
        ariaLabel: 'Upload',
        valueText: '42 percent',
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
                    ['Upload'],
                  ),
                  h.span(
                    [h.Class('tabular-nums text-gray-600 dark:text-gray-400')],
                    ['42%'],
                  ),
                ],
              ),
              h.div(
                [...attributes.progress, h.Class(trackClassName)],
                [
                  h.div(
                    [...attributes.track, h.Class('h-full w-full')],
                    [
                      h.div([
                        ...attributes.indicator,
                        h.Class(indicatorClassName),
                      ]),
                    ],
                  ),
                ],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

export const indeterminateDemo = (h: HtmlBuilder<Message>) => {
  return [
    Progress.view(
      {
        id: 'progress-indeterminate-demo',
        ariaLabel: 'Loading',
        valueText: 'Loading',
        toView: attributes =>
          h.div(
            [h.Class('flex flex-col gap-2 w-full max-w-sm')],
            [
              h.span(
                [
                  ...attributes.label,
                  h.Class('font-medium text-gray-900 dark:text-white'),
                ],
                ['Loading'],
              ),
              h.div(
                [...attributes.progress, h.Class(trackClassName)],
                [
                  h.div([
                    ...attributes.indicator,
                    h.Class(
                      'h-full w-1/3 rounded-full bg-blue-600 animate-[progress-indeterminate_1s_ease-in-out_infinite]',
                    ),
                  ]),
                ],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

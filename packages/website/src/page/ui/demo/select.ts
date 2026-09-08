import type { HtmlBuilder } from 'foldkit/html'

import { Select } from '@foldkit/ui'

import { Icon } from '../../../icon'
import { Message } from '../message'
import type { Model } from '../model'

// DEMO CONTENT

const selectWrapperClassName = 'relative w-full'

const chevronClassName =
  'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500'

// VIEW

export const basicDemo = (model: Model, h: HtmlBuilder<Message>) => {
  return [
    h.div(
      [h.Class('flex flex-col items-start gap-2 w-full max-w-md')],
      [
        Select.view(
          {
            id: 'select-basic-demo',
            value: model.selectDemoValue,
            onChange: value => Message.UpdatedSelectDemoValue({ value }),
            toView: attributes =>
              h.div(
                [h.Class('demo-field w-full')],
                [
                  h.label(
                    [...attributes.label, h.Class('demo-label')],
                    ['Country'],
                  ),
                  h.div(
                    [h.Class(selectWrapperClassName)],
                    [
                      h.select(
                        [...attributes.select, h.Class('demo-field-select')],
                        [
                          h.option([h.Value('us')], ['United States']),
                          h.option([h.Value('ca')], ['Canada']),
                          h.option([h.Value('gb')], ['United Kingdom']),
                          h.option([h.Value('au')], ['Australia']),
                        ],
                      ),
                      h.span(
                        [h.Class(chevronClassName)],
                        [Icon.chevronDown('w-4 h-4')],
                      ),
                    ],
                  ),
                  h.span(
                    [...attributes.description, h.Class('demo-description')],
                    ['Where you currently reside.'],
                  ),
                ],
              ),
          },
          h,
        ),
      ],
    ),
  ]
}

export const disabledDemo = (_model: Model, h: HtmlBuilder<Message>) => {
  return [
    Select.view(
      {
        id: 'select-disabled-demo',
        isDisabled: true,
        value: 'us',
        toView: attributes =>
          h.div(
            [h.Class('demo-field w-full max-w-md')],
            [
              h.label(
                [...attributes.label, h.Class('demo-label')],
                ['Country'],
              ),
              h.div(
                [h.Class(selectWrapperClassName)],
                [
                  h.select(
                    [...attributes.select, h.Class('demo-field-select')],
                    [
                      h.option([h.Value('us')], ['United States']),
                      h.option([h.Value('ca')], ['Canada']),
                      h.option([h.Value('gb')], ['United Kingdom']),
                      h.option([h.Value('au')], ['Australia']),
                    ],
                  ),
                  h.span(
                    [h.Class(chevronClassName)],
                    [Icon.chevronDown('w-4 h-4')],
                  ),
                ],
              ),
              h.span(
                [...attributes.description, h.Class('demo-description')],
                ['This select is disabled.'],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

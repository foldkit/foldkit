import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

import { Icon } from '../../icon'
import type { TableOfContentsEntry } from '../../main'
import { type Message, UpdatedSelectDemoValue } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'basic',
  text: 'Basic',
}

export const disabledHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'disabled',
  text: 'Disabled',
}

// DEMO CONTENT

const selectClassName =
  'appearance-none inline-flex items-center gap-2 w-full px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:focus:border-accent-400 dark:focus:ring-accent-400 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const selectWrapperClassName = 'relative w-full'

const chevronClassName =
  'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500'

const labelClassName =
  'block text-sm font-medium text-gray-700 dark:text-gray-300'

const descriptionClassName = 'text-sm text-gray-500 dark:text-gray-400'

// VIEW

export const basicDemo = (model: Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex flex-col items-start gap-2 w-full max-w-md')],
      [
        Ui.Select.view({
          id: 'select-basic-demo',
          value: model.selectDemoValue,
          onChange: value => UpdatedSelectDemoValue({ value }),
          toView: attributes =>
            h.div(
              [h.Class('flex flex-col gap-1.5 w-full')],
              [
                h.label(
                  [...attributes.label, h.Class(labelClassName)],
                  ['Country'],
                ),
                h.div(
                  [h.Class(selectWrapperClassName)],
                  [
                    h.select(
                      [...attributes.select, h.Class(selectClassName)],
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
                  [...attributes.description, h.Class(descriptionClassName)],
                  ['Where you currently reside.'],
                ),
              ],
            ),
        }),
      ],
    ),
  ]
}

export const disabledDemo = (_model: Model) => {
  const h = html<Message>()

  return [
    Ui.Select.view<Message>({
      id: 'select-disabled-demo',
      isDisabled: true,
      value: 'us',
      toView: attributes =>
        h.div(
          [h.Class('flex flex-col gap-1.5 w-full max-w-md')],
          [
            h.label(
              [...attributes.label, h.Class(labelClassName)],
              ['Country'],
            ),
            h.div(
              [h.Class(selectWrapperClassName)],
              [
                h.select(
                  [...attributes.select, h.Class(selectClassName)],
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
              [...attributes.description, h.Class(descriptionClassName)],
              ['This select is disabled.'],
            ),
          ],
        ),
    }),
  ]
}

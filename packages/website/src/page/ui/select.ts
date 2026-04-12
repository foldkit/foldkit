import { Ui } from 'foldkit'

import { Class, Value, div, label, option, select, span } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
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

export const basicDemo = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  div(
    [Class('flex flex-col items-start gap-2 w-full max-w-md')],
    [
      Ui.Select.view({
        id: 'select-basic-demo',
        value: model.selectDemoValue,
        onChange: value => toParentMessage(UpdatedSelectDemoValue({ value })),
        toView: attributes =>
          div(
            [Class('flex flex-col gap-1.5 w-full')],
            [
              label([...attributes.label, Class(labelClassName)], ['Country']),
              div(
                [Class(selectWrapperClassName)],
                [
                  select(
                    [...attributes.select, Class(selectClassName)],
                    [
                      option([Value('us')], ['United States']),
                      option([Value('ca')], ['Canada']),
                      option([Value('gb')], ['United Kingdom']),
                      option([Value('au')], ['Australia']),
                    ],
                  ),
                  span(
                    [Class(chevronClassName)],
                    [Icon.chevronDown('w-4 h-4')],
                  ),
                ],
              ),
              span(
                [...attributes.description, Class(descriptionClassName)],
                ['Where you currently reside.'],
              ),
            ],
          ),
      }),
    ],
  ),
]

export const disabledDemo = (
  _model: Model,
  _toParentMessage: (message: Message) => ParentMessage,
) => [
  Ui.Select.view<ParentMessage>({
    id: 'select-disabled-demo',
    isDisabled: true,
    value: 'us',
    toView: attributes =>
      div(
        [Class('flex flex-col gap-1.5 w-full max-w-md')],
        [
          label([...attributes.label, Class(labelClassName)], ['Country']),
          div(
            [Class(selectWrapperClassName)],
            [
              select(
                [...attributes.select, Class(selectClassName)],
                [
                  option([Value('us')], ['United States']),
                  option([Value('ca')], ['Canada']),
                  option([Value('gb')], ['United Kingdom']),
                  option([Value('au')], ['Australia']),
                ],
              ),
              span([Class(chevronClassName)], [Icon.chevronDown('w-4 h-4')]),
            ],
          ),
          span(
            [...attributes.description, Class(descriptionClassName)],
            ['This select is disabled.'],
          ),
        ],
      ),
  }),
]

import { Ui } from 'foldkit'

import { Class, div, input, label, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { heading } from '../../prose'
import { type Message, UpdatedInputDemoValue } from './message'
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

const inputClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-accent-400 dark:focus:ring-accent-400 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'block text-sm font-medium text-gray-700 dark:text-gray-300'

const descriptionClassName = 'text-sm text-gray-500 dark:text-gray-400'

// VIEW

export const basicDemo = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  heading('h3', basicHeader.id, basicHeader.text),
  div(
    [Class('flex flex-col items-start gap-2 max-w-sm')],
    [
      Ui.Input.view({
        id: 'input-basic-demo',
        value: model.inputDemoValue,
        onInput: value => toParentMessage(UpdatedInputDemoValue({ value })),
        placeholder: 'Enter your full name',
        toView: attributes =>
          div(
            [Class('flex flex-col gap-1.5 w-full')],
            [
              label([...attributes.label, Class(labelClassName)], ['Name']),
              input([...attributes.input, Class(inputClassName)]),
              span(
                [...attributes.description, Class(descriptionClassName)],
                ['As it appears on your government-issued ID.'],
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
  heading('h3', disabledHeader.id, disabledHeader.text),
  Ui.Input.view<ParentMessage>({
    id: 'input-disabled-demo',
    isDisabled: true,
    value: 'Ada Lovelace',
    toView: attributes =>
      div(
        [Class('flex flex-col gap-1.5 max-w-sm')],
        [
          label([...attributes.label, Class(labelClassName)], ['Name']),
          input([...attributes.input, Class(inputClassName)]),
          span(
            [...attributes.description, Class(descriptionClassName)],
            ['This input is disabled.'],
          ),
        ],
      ),
  }),
]

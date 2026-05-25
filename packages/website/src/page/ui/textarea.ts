import { Ui } from 'foldkit'
import { html } from 'foldkit/html'

import type { TableOfContentsEntry } from '../../main'
import { type Message, UpdatedTextareaDemoValue } from './message'
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

const textareaClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-accent-400 dark:focus:ring-accent-400 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

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
        Ui.Textarea.view({
          id: 'textarea-basic-demo',
          value: model.textareaDemoValue,
          onInput: value => UpdatedTextareaDemoValue({ value }),
          placeholder: 'Tell us about yourself...',
          rows: 4,
          toView: attributes =>
            h.div(
              [h.Class('flex flex-col gap-1.5 w-full')],
              [
                h.label(
                  [...attributes.label, h.Class(labelClassName)],
                  ['Bio'],
                ),
                h.textarea(
                  [...attributes.textarea, h.Class(textareaClassName)],
                  [],
                ),
                h.span(
                  [...attributes.description, h.Class(descriptionClassName)],
                  ['A brief introduction about yourself.'],
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
    Ui.Textarea.view<Message>({
      id: 'textarea-disabled-demo',
      isDisabled: true,
      value:
        'Mathematician and writer, known for work on Charles Babbage’s Analytical Engine.',
      rows: 3,
      toView: attributes =>
        h.div(
          [h.Class('flex flex-col gap-1.5 w-full max-w-md')],
          [
            h.label([...attributes.label, h.Class(labelClassName)], ['Bio']),
            h.textarea(
              [...attributes.textarea, h.Class(textareaClassName)],
              [],
            ),
            h.span(
              [...attributes.description, h.Class(descriptionClassName)],
              ['This textarea is disabled.'],
            ),
          ],
        ),
    }),
  ]
}

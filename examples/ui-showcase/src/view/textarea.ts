import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, div, h2, h3, label, span, textarea } from '../html'
import type { Message as ParentMessage } from '../main'
import { type UiMessage, UpdatedTextareaDemoValue } from '../message'
import type { UiModel } from '../model'

const textareaClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName = 'block text-sm font-medium text-gray-700'

const descriptionClassName = 'text-sm text-gray-500'

export const view = (
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Textarea']),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Basic']),
      div(
        [Class('flex flex-col items-start gap-2 max-w-sm')],
        [
          Ui.Textarea.view({
            id: 'textarea-basic-demo',
            value: model.textareaDemoValue,
            onInput: value =>
              toParentMessage(UpdatedTextareaDemoValue({ value })),
            placeholder: 'Tell us about yourself...',
            rows: 4,
            toView: attributes =>
              div(
                [Class('flex flex-col gap-1.5 w-full')],
                [
                  label([...attributes.label, Class(labelClassName)], ['Bio']),
                  textarea(
                    [...attributes.textarea, Class(textareaClassName)],
                    [],
                  ),
                  span(
                    [...attributes.description, Class(descriptionClassName)],
                    ['A brief introduction about yourself.'],
                  ),
                ],
              ),
          }),
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Disabled'],
      ),
      Ui.Textarea.view<ParentMessage>({
        id: 'textarea-disabled-demo',
        isDisabled: true,
        value:
          "Mathematician and writer, known for work on Charles Babbage's Analytical Engine.",
        rows: 3,
        toView: attributes =>
          div(
            [Class('flex flex-col gap-1.5 max-w-sm')],
            [
              label([...attributes.label, Class(labelClassName)], ['Bio']),
              textarea([...attributes.textarea, Class(textareaClassName)], []),
              span(
                [...attributes.description, Class(descriptionClassName)],
                ['This textarea is disabled.'],
              ),
            ],
          ),
      }),
    ],
  )

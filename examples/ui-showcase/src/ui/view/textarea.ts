import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { type UiMessage, UpdatedTextareaDemoValue } from '../message'
import type { UiModel } from '../model'

const textareaClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName = 'block text-sm font-medium text-gray-700'

const descriptionClassName = 'text-sm text-gray-500'

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Textarea']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.div(
        [h.Class('flex flex-col items-start gap-2 max-w-sm')],
        [
          Ui.Textarea.view<UiMessage>({
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

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Disabled'],
      ),
      Ui.Textarea.view<UiMessage>({
        id: 'textarea-disabled-demo',
        isDisabled: true,
        value:
          "Mathematician and writer, known for work on Charles Babbage's Analytical Engine.",
        rows: 3,
        toView: attributes =>
          h.div(
            [h.Class('flex flex-col gap-1.5 max-w-sm')],
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
    ],
  )
})

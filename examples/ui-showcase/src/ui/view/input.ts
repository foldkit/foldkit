import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { type UiMessage, UpdatedInputDemoValue } from '../message'
import type { UiModel } from '../model'

const inputClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName = 'block text-sm font-medium text-gray-700'

const descriptionClassName = 'text-sm text-gray-500'

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Input']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.div(
        [h.Class('flex flex-col items-start gap-2 max-w-sm')],
        [
          Ui.Input.view<UiMessage>({
            id: 'input-basic-demo',
            value: model.inputDemoValue,
            onInput: value => UpdatedInputDemoValue({ value }),
            placeholder: 'Enter your full name',
            toView: attributes =>
              h.div(
                [h.Class('flex flex-col gap-1.5 w-full')],
                [
                  h.label(
                    [...attributes.label, h.Class(labelClassName)],
                    ['Name'],
                  ),
                  h.input([...attributes.input, h.Class(inputClassName)]),
                  h.span(
                    [...attributes.description, h.Class(descriptionClassName)],
                    ['As it appears on your government-issued ID.'],
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
      Ui.Input.view<UiMessage>({
        id: 'input-disabled-demo',
        isDisabled: true,
        value: 'Ada Lovelace',
        toView: attributes =>
          h.div(
            [h.Class('flex flex-col gap-1.5 max-w-sm')],
            [
              h.label([...attributes.label, h.Class(labelClassName)], ['Name']),
              h.input([...attributes.input, h.Class(inputClassName)]),
              h.span(
                [...attributes.description, h.Class(descriptionClassName)],
                ['This input is disabled.'],
              ),
            ],
          ),
      }),
    ],
  )
})

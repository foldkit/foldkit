import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Input } from '@foldkit/ui'

const Model = Schema.Struct({
  inputDemoValue: Schema.String,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedInputDemoValue: { value: Schema.String },
})
type Message = typeof Message.Type

export class InputPage extends Block<InputPage>()('InputPage', {
  Model,
  Message,
}) {}

export const InputPageLive = InputPage.make(
  Effect.fn(function* () {
    return {
      model: { inputDemoValue: '' },

      update: {
        UpdatedInputDemoValue: (model, { value }) => ({
          model: modifyFields(model, { inputDemoValue: () => value }),
        }),
      },

      view,
    }
  }),
)

const inputClassName =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 transition-colors placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName = 'block text-sm font-medium text-gray-700'

const descriptionClassName = 'text-sm text-gray-500'

const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const basicInputView = (attributes: Input.InputAttributes<Message>): Html =>
    h.div(
      [h.Class('flex flex-col gap-1.5 w-full')],
      [
        h.label([...attributes.label, h.Class(labelClassName)], ['Name']),
        h.input([...attributes.input, h.Class(inputClassName)]),
        h.span(
          [...attributes.description, h.Class(descriptionClassName)],
          ['As it appears on your government-issued ID.'],
        ),
      ],
    )

  const disabledInputView = (
    attributes: Input.InputAttributes<Message>,
  ): Html =>
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
    )

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
          Input.view(
            {
              id: 'input-basic-demo',
              value: model.inputDemoValue,
              hasDescription: true,
              onInput: value => Message.UpdatedInputDemoValue({ value }),
              placeholder: 'Enter your full name',
              toView: basicInputView,
            },
            h,
          ),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Disabled'],
      ),
      Input.view(
        {
          id: 'input-disabled-demo',
          isDisabled: true,
          hasDescription: true,
          value: 'Ada Lovelace',
          toView: disabledInputView,
        },
        h,
      ),
    ],
  )
}

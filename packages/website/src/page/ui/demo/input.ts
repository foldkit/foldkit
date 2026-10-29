import { Input } from '@foldkit/ui'

import type { UiViewBuilder } from '../composition'
import { Message } from '../message'
import type { Model } from '../model'

export const basicDemo = (model: Model, h: UiViewBuilder) => {
  return [
    h.div(
      [h.Class('flex flex-col items-start gap-2 w-full max-w-md')],
      [
        Input.view(
          {
            id: 'input-basic-demo',
            value: model.inputDemoValue,
            hasDescription: true,
            onInput: value => Message.UpdatedInputDemoValue({ value }),
            placeholder: 'Enter your full name',
            toView: attributes =>
              h.div(
                [h.Class('demo-field w-full')],
                [
                  h.label(
                    [...attributes.label, h.Class('demo-label')],
                    ['Name'],
                  ),
                  h.input([...attributes.input, h.Class('demo-field-input')]),
                  h.span(
                    [...attributes.description, h.Class('demo-description')],
                    ['As it appears on your government-issued ID.'],
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

export const disabledDemo = (_model: Model, h: UiViewBuilder) => {
  return [
    Input.view(
      {
        id: 'input-disabled-demo',
        isDisabled: true,
        hasDescription: true,
        value: 'Ada Lovelace',
        toView: attributes =>
          h.div(
            [h.Class('demo-field w-full max-w-md')],
            [
              h.label([...attributes.label, h.Class('demo-label')], ['Name']),
              h.input([...attributes.input, h.Class('demo-field-input')]),
              h.span(
                [...attributes.description, h.Class('demo-description')],
                ['This input is disabled.'],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

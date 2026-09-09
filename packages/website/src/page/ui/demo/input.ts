import type { HtmlBuilder } from 'foldkit/html'

import { Input } from '@foldkit/ui'

import { Message } from '../message'
import type { Model } from '../model'

// VIEW

export const basicDemo = (model: Model, h: HtmlBuilder<Message>) => {
  return [
    h.div(
      [h.Class('flex flex-col items-start gap-2 w-full max-w-md')],
      [
        Input.view(
          {
            id: 'input-basic-demo',
            value: model.inputDemoValue,
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

export const disabledDemo = (_model: Model, h: HtmlBuilder<Message>) => {
  return [
    Input.view(
      {
        id: 'input-disabled-demo',
        isDisabled: true,
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

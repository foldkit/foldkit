import type { HtmlBuilder } from 'foldkit/html'

import { Textarea } from '@foldkit/ui'

import { Message } from '../message'
import type { Model } from '../model'

// VIEW

export const basicDemo = (model: Model, h: HtmlBuilder<Message>) => {
  return [
    h.div(
      [h.Class('flex flex-col items-start gap-2 w-full max-w-md')],
      [
        Textarea.view(
          {
            id: 'textarea-basic-demo',
            value: model.textareaDemoValue,
            onInput: value => Message.UpdatedTextareaDemoValue({ value }),
            placeholder: 'Tell us about yourself...',
            rows: 4,
            toView: attributes =>
              h.div(
                [h.Class('demo-field w-full')],
                [
                  h.label(
                    [...attributes.label, h.Class('demo-label')],
                    ['Bio'],
                  ),
                  h.textarea([
                    ...attributes.textarea,
                    h.Class('demo-field-textarea'),
                  ]),
                  h.span(
                    [...attributes.description, h.Class('demo-description')],
                    ['A brief introduction about yourself.'],
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
    Textarea.view(
      {
        id: 'textarea-disabled-demo',
        isDisabled: true,
        value:
          'Mathematician and writer, known for work on Charles Babbage’s Analytical Engine.',
        rows: 3,
        toView: attributes =>
          h.div(
            [h.Class('demo-field w-full max-w-md')],
            [
              h.label([...attributes.label, h.Class('demo-label')], ['Bio']),
              h.textarea([
                ...attributes.textarea,
                h.Class('demo-field-textarea'),
              ]),
              h.span(
                [...attributes.description, h.Class('demo-description')],
                ['This textarea is disabled.'],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

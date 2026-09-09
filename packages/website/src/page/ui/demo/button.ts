import type { HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { Message } from '../message'
import type { Model } from '../model'

// DEMO CONTENT

const buttonClassName =
  'button-accent inline-flex items-center gap-2 rounded-lg px-3 py-2 text-base shadow-sm cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

// VIEW

export const basicDemo = (model: Model, h: HtmlBuilder<Message>) => {
  return [
    h.div(
      [h.Class('flex flex-col items-center gap-2')],
      [
        Button.view(
          {
            onClick: Message.ClickedButtonDemo(),
            toView: attributes =>
              h.button(
                [...attributes.button, h.Class(buttonClassName)],
                ['Click me'],
              ),
          },
          h,
        ),
        h.span(
          [h.Class('text-sm text-gray-600 dark:text-gray-400')],
          [
            `Clicked ${model.buttonClickCount} time${model.buttonClickCount === 1 ? '' : 's'}`,
          ],
        ),
      ],
    ),
  ]
}

export const disabledDemo = (_model: Model, h: HtmlBuilder<Message>) => {
  return [
    Button.view(
      {
        isDisabled: true,
        toView: attributes =>
          h.button(
            [...attributes.button, h.Class(buttonClassName)],
            ['Disabled'],
          ),
      },
      h,
    ),
  ]
}

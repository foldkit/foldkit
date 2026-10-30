import { Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

const Model = Schema.Struct({
  buttonClickCount: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedButtonDemo: {},
})
type Message = typeof Message.Type

export class ButtonPage extends Block<ButtonPage>()('ButtonPage', {
  Model,
  Message,
}) {}

export const ButtonPageLive = ButtonPage.make(
  Effect.fn(function* () {
    return {
      model: { buttonClickCount: 0 },

      update: {
        ClickedButtonDemo: model => ({
          model: modifyFields(model, { buttonClickCount: Number.increment }),
        }),
      },

      view,
    }
  }),
)

const buttonClassName =
  'inline-flex items-center gap-2 rounded-lg bg-accent-600 px-3 py-2 text-base font-semibold text-white shadow-sm transition-colors hover:not-data-[disabled]:bg-accent-600/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Button']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.div(
        [h.Class('flex flex-col items-start gap-2')],
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
            [h.Class('text-sm text-gray-600')],
            [
              `Clicked ${model.buttonClickCount} time${model.buttonClickCount === 1 ? '' : 's'}`,
            ],
          ),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Disabled'],
      ),
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
    ],
  )
}

import { Number, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

export const Model = Schema.Struct({
  count: Schema.Number,
})

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})

export const ApplicationComposition = defineApplication({
  Model,
  Message,
}).makeComposition()

export const init = ApplicationComposition.makeInit(() => ({
  model: { count: 0 },
}))

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedDecrement: () => ({
      model: modifyFields(model, { count: Number.decrement }),
    }),
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: Number.increment }),
    }),
    ClickedReset: () => ({
      model: modifyFields(model, { count: () => 0 }),
    }),
  }),
)

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `Counter: ${model.count}`,
  body: h.div(
    [
      h.Class(
        'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6',
      ),
    ],
    [
      h.p(
        [h.Class('text-6xl font-bold text-gray-800')],
        [model.count.toString()],
      ),
      h.div(
        [h.Class('flex flex-wrap justify-center gap-4')],
        [
          Button.view(
            {
              onClick: Message.ClickedDecrement(),
              toView: attributes =>
                h.button([...attributes.button, h.Class(buttonStyle)], ['-']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedReset(),
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(buttonStyle)],
                  ['Reset'],
                ),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedIncrement(),
              toView: attributes =>
                h.button([...attributes.button, h.Class(buttonStyle)], ['+']),
            },
            h,
          ),
        ],
      ),
    ],
  ),
}))

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

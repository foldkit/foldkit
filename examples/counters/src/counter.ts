import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

export const Model = Schema.Struct({
  count: Schema.Number,
})

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
})

const Counter = Block.define('Counter', { Model, Message })
const CounterComposition = Counter.makeComposition()

export const init = CounterComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

export const update = CounterComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedDecrement: () => ({
      model: modifyFields(model, { count: count => count - 1 }),
    }),
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
  }),
)

export const view = CounterComposition.makeView((model, h) =>
  h.div(
    [
      h.Class(
        'flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3',
      ),
    ],
    [
      Button.view(
        {
          onClick: Message.ClickedDecrement(),
          toView: attributes =>
            h.button([...attributes.button, h.Class(buttonStyle)], ['-']),
        },
        h,
      ),
      h.span(
        [h.Class('w-12 text-center text-2xl font-mono tabular-nums')],
        [model.count.toString()],
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
)

const buttonStyle =
  'h-9 w-9 rounded bg-gray-900 text-white text-lg leading-none hover:bg-gray-700 transition cursor-pointer'

export const block = CounterComposition.makeBlock({
  init,
  update,
  view,
})

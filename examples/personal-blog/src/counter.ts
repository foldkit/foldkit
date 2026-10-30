import { Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

const Model = Schema.Struct({ count: Schema.Number })

const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
})

export class Counter extends Block<Counter>()('Counter', {
  Model,
  Message,
}) {}

const buttonStyle =
  'h-9 w-9 rounded-full border border-stone-300 text-lg leading-none text-stone-700 hover:bg-stone-100 transition cursor-pointer'

export const CounterLive = Counter.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },

      update: {
        ClickedDecrement: model => ({
          model: modifyFields(model, { count: Number.decrement }),
        }),
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
      },

      view: (model, h) =>
        h.div(
          [h.Class('flex items-center gap-4')],
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
              [h.Class('w-12 text-center font-mono text-2xl tabular-nums')],
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
    }
  }),
)

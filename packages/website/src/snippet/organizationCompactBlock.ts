// counter.ts
import { Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedIncrement: {} })
type Message = typeof Message.Type

export class Counter extends Block<Counter>()('Counter', {
  Model,
  Message,
}) {}

export const CounterLive = Counter.toLayer(() => ({
  init: () => ({ count: 0 }),
  update: {
    ClickedIncrement: model => ({
      model: modifyFields(model, { count: Number.increment }),
    }),
  },
  view: (model, h) =>
    h.button(
      [h.OnClick(Message.ClickedIncrement())],
      [`Count: ${model.count}`],
    ),
}))

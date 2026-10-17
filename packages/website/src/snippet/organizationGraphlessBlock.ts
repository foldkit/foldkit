import { Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({ ClickedIncrement: {} })
export type Message = typeof Message.Type

const Counter = Block.define('Counter', { Model, Message })
const CounterComposition = Counter.makeComposition()

const init = CounterComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const update = CounterComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: Number.increment }),
    }),
  }),
)
const view = CounterComposition.makeView((model, h) =>
  h.button([h.OnClick(Message.ClickedIncrement())], [`Count: ${model.count}`]),
)

export const block = CounterComposition.makeBlock({ init, update, view })

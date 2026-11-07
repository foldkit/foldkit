import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedIncrement: {} })
type Message = typeof Message.Type

export const CounterKey = Symbol('Counter')
export const CounterBlock = Block.make('Counter', {
  key: CounterKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeComposition } = CounterBlock

const CounterComposition = makeComposition()
const init = CounterComposition.makeInit(() => ({ model: { count: 0 } }))
const update = CounterComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})
const view = CounterComposition.makeView((model, h) =>
  h.button([h.OnClick(Message.ClickedIncrement())], [`Count: ${model.count}`]),
)

export const layer = CounterBlock.makeLayer({
  init,
  update,
  view,
})

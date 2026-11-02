import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedIncrement: {} })
type Message = typeof Message.Type

const CounterKey = Symbol('Counter')

const CounterDefinition = Block.makeDefinition('Counter', {
  key: CounterKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const CounterComposition = CounterDefinition.makeComposition()
const init = CounterComposition.makeInit(() => ({ model: { count: 0 } }))
const update = CounterComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})
const view = CounterComposition.makeView((model, h) =>
  h.button([h.OnClick(Message.ClickedIncrement())], [`Count: ${model.count}`]),
)

export const CounterBlock = CounterDefinition.contract

export const layer = CounterDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update, view }
  }),
).layer

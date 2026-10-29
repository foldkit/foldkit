import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedIncrement: {} })
type Message = typeof Message.Type

const CounterComposition = Block.makeDefinition('Counter', {
  Model,
  Message,
}).makeComposition()
const init = CounterComposition.makeInit(() => ({ model: { count: 0 } }))
const update = CounterComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})
const view = CounterComposition.makeView((model, h) =>
  h.button([h.OnClick(Message.ClickedIncrement())], [`Count: ${model.count}`]),
)

const prepare = () => CounterComposition.prepareBlock({ init, update, view })
export interface CounterBlock extends Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> {}
export const CounterBlock: CounterBlock = Block.assemble(prepare)

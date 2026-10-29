import { Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedIncrement: {}, RequestedReset: {} })
type Message = typeof Message.Type

const CounterComposition = Block.makeDefinition('Counter', {
  Model,
  Message,
}).makeComposition()

const init = CounterComposition.makeInit((initialCount: number) => ({
  model: { count: initialCount },
}))
const update = CounterComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: Number.increment }),
  }),
  RequestedReset: model => ({
    model: modifyFields(model, { count: () => 0 }),
  }),
})
const view = CounterComposition.makeView((model, h) =>
  h.button([h.OnClick(Message.ClickedIncrement())], [`Count: ${model.count}`]),
)

const prepare = () =>
  CounterComposition.prepareBlock({
    init,
    update,
    view,
    operations: { requestReset: Message.RequestedReset },
  })
export const CounterBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

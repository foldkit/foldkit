import { Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedIncrement: {} })
type Message = typeof Message.Type

const InMessage = defineInMessageUnion({ RequestedReset: {} })
type InMessage = typeof InMessage.Type

export const CounterKey = Symbol('Counter')
export const CounterBlock = Block.make('Counter', {
  key: CounterKey,
  InitArgs: Schema.Tuple([Schema.Number]),
  view: { kind: 'Element' },
  InMessage,

  Model,
  Message,
})

const { makeComposition } = CounterBlock

const CounterComposition = makeComposition()

const init = CounterComposition.makeInit(initialCount => ({
  model: { count: initialCount },
}))
const update = CounterComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: Number.increment }),
  }),
})
const inMessageUpdate = CounterComposition.makeInMessageUpdate({
  RequestedReset: model => ({
    model: modifyFields(model, { count: () => 0 }),
  }),
})
const view = CounterComposition.makeView((model, h) =>
  h.button([h.OnClick(Message.ClickedIncrement())], [`Count: ${model.count}`]),
)

export const layer = CounterBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
})

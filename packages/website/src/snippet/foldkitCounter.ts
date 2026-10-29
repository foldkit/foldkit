import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({
  count: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedIncrement: {},
})
type Message = typeof Message.Type

const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  }),
})

const view = ApplicationComposition.makeView((model, h) => ({
  title: `Count: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
    ],
  ),
}))

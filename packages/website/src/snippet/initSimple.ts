import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({
  count: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedDecrement: {},
})
type Message = typeof Message.Type

const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

const init = ApplicationComposition.makeInit(() => ({
  model: { count: 0 },
}))

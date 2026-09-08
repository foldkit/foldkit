import { Schema } from 'effect'
import type { Runtime } from 'foldkit'
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

const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { count: 0 },
})

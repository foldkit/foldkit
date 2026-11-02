import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({
  count: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})
export type Message = typeof Message.Type

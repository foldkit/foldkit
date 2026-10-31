import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ isTicking: Schema.Boolean })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Ticked: {},
  CompletedLoadPreferences: {},
})
export type Message = typeof Message.Type

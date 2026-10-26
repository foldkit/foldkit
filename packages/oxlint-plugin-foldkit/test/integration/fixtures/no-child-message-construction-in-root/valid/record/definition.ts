import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({
  ClickedDirectRecord: {},
  ClickedContextRecord: {},
})

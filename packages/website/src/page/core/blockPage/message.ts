import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ToggledMessageRoutingUnderHood: { isOpen: Schema.Boolean },
})
export type Message = typeof Message.Type

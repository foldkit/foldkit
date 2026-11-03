import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ToggledMapMessagesUnderHood: { isOpen: Schema.Boolean },
})
export type Message = typeof Message.Type

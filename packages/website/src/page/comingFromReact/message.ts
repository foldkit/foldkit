import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ToggledFaq: {
    id: Schema.String,
    isOpen: Schema.Boolean,
  },
})
export type Message = typeof Message.Type

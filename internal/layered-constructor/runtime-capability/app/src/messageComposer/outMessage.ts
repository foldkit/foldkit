import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const OutMessage = defineMessageUnion({
  Submitted: { text: Schema.String },
})
export type OutMessage = typeof OutMessage.Type

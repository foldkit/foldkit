import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  ClickedMember: { memberId: Schema.String },
})
export type Message = typeof Message.Type

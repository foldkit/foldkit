import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  UpdatedText: { value: Schema.String },
  SubmittedForm: {},
  RequestedClear: {},
  CompletedFocusInput: {},
})
export type Message = typeof Message.Type

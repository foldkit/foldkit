import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedAdvance: {},
  ChangedStep: { step: Schema.Number },
  CompletedReportCount: {},
})
export type Message = typeof Message.Type

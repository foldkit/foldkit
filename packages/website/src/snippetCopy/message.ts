import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedCopySnippet: { snippetId: Schema.String, text: Schema.String },
  SucceededCopySnippet: { snippetId: Schema.String },
  FailedCopySnippet: {},
  CompletedWaitBeforeHidingCopiedIndicator: { snippetId: Schema.String },
})
export type Message = typeof Message.Type

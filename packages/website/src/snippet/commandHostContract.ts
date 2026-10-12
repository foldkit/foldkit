import { Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  SucceededSaveDocument: {},
  FailedSaveDocument: { reason: Schema.String },
})

export const SaveDocument = Command.define('SaveDocument', {
  args: { contents: Schema.String },
  messages: [Message.SucceededSaveDocument, Message.FailedSaveDocument],
})

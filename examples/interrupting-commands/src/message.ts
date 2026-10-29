import { Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedStartUpload: {},
  ClickedCancelUpload: { uploadId: Schema.Number },
  ClickedCancelAllUploads: {},
  ClickedRestartUpload: { uploadId: Schema.Number },
  CompletedUploadFile: { uploadId: Schema.Number },
  CompletedCancelUploadFile: {
    uploadId: Schema.Number,
    outcome: Command.Interruptible.Outcome,
  },
})
export type Message = typeof Message.Type

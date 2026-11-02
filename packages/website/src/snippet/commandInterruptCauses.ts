import { Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  SucceededUploadFile: { uploadId: Schema.Int },
  CompletedCancelUploadFileDueToClickedCancel: {
    uploadId: Schema.Int,
    outcome: Command.Interruptible.Outcome,
  },
  CompletedCancelUploadFileDueToSelectedNewFile: {
    uploadId: Schema.Int,
    nextFile: Schema.instanceOf(File),
    outcome: Command.Interruptible.Outcome,
  },
})

const UploadFile = Command.define('UploadFile', {
  args: { uploadId: Schema.Int, file: Schema.instanceOf(File) },
  messages: [Message.SucceededUploadFile],
  interrupt: {
    keyFields: ['uploadId'],
    toKey: ({ uploadId }) => globalThis.String(uploadId),
  },
})

export const CancelUploadFileDueToClickedCancel = (uploadId: number) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    Message.CompletedCancelUploadFileDueToClickedCancel({
      uploadId,
      outcome,
    }),
  )

export const CancelUploadFileDueToSelectedNewFile = (
  uploadId: number,
  nextFile: File,
) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    Message.CompletedCancelUploadFileDueToSelectedNewFile({
      uploadId,
      nextFile,
      outcome,
    }),
  )

import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  SucceededUploadFile: { uploadId: Schema.Number },
  FailedUploadFile: { uploadId: Schema.Number },
})

const UploadFile = Command.define('UploadFile', {
  args: {
    uploadId: Schema.Number,
    file: Schema.instanceOf(File),
  },
  messages: [Message.SucceededUploadFile, Message.FailedUploadFile],
  interrupt: {
    keyFields: ['uploadId'],
    toKey: ({ uploadId }) => globalThis.String(uploadId),
  },
  execute: ({ uploadId, file }) =>
    postFile(file).pipe(
      Effect.as(Message.SucceededUploadFile({ uploadId })),
      Effect.catch(() =>
        Effect.succeed(Message.FailedUploadFile({ uploadId })),
      ),
    ),
})

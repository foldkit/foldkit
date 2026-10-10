import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  SucceededUploadFile: { uploadId: Schema.Int },
  FailedUploadFile: { uploadId: Schema.Int },
  CompletedCancelUploadFile: {
    uploadId: Schema.Int,
    outcome: Command.Interruptible.Outcome,
  },
})
export type Message = typeof Message.Type

export const UploadFile = Command.define('UploadFile', {
  args: {
    uploadId: Schema.Int,
    file: Schema.instanceOf(File),
  },
  messages: [Message.SucceededUploadFile, Message.FailedUploadFile],
  interrupt: {
    keyFields: ['uploadId'],
    toKey: ({ uploadId }) => globalThis.String(uploadId),
  },
})

export const UploadFileLayer = UploadFile.toLayer(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return ({ uploadId, file }) =>
      Effect.gen(function* () {
        const formData = new FormData()
        formData.set('file', file)

        const request = HttpClientRequest.post(`/api/uploads/${uploadId}`).pipe(
          HttpClientRequest.bodyFormData(formData),
        )
        const response = yield* client.execute(request)
        yield* HttpClientResponse.filterStatusOk(response)

        return Message.SucceededUploadFile({ uploadId })
      }).pipe(
        Effect.catch(() =>
          Effect.succeed(Message.FailedUploadFile({ uploadId })),
        ),
      )
  }),
)

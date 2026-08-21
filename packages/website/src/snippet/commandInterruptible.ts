import { Array, Effect, Match as M, Schema as S } from 'effect'
import { Command, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedCancelUpload: { uploadId: S.Number },
  SucceededUploadFile: { uploadId: S.Number },
  FailedUploadFile: { uploadId: S.Number },
  CompletedCancelUploadFile: {
    uploadId: S.Number,
    outcome: Command.Interruptible.Outcome,
  },
})

const UploadKey = S.Struct({ uploadId: S.Number })
type UploadKey = typeof UploadKey.Type

const UploadFile = Command.define('UploadFile', {
  args: { ...UploadKey.fields, file: S.instanceOf(File) },
  messages: [Message.SucceededUploadFile, Message.FailedUploadFile],
  // The key function maps args to what distinguishes invocations. Foldkit
  // prefixes the Command name automatically, so the full key for upload 7
  // is "UploadFile:7".
  interrupt: {
    keyFields: ['uploadId'],
    toKey: ({ uploadId }) => String(uploadId),
  },
  execute: ({ uploadId, file }) =>
    postFile(file).pipe(
      Effect.as(Message.SucceededUploadFile({ uploadId })),
      Effect.catch(() =>
        Effect.succeed(Message.FailedUploadFile({ uploadId })),
      ),
    ),
})

const setStatusForId = (uploadId: number, status: UploadStatus) =>
  Array.map((upload: Upload) =>
    upload.id === uploadId ? evo(upload, { status: () => status }) : upload,
  )

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    // Interrupt only the upload with this uploadId.
    ClickedCancelUpload: ({ uploadId }) => ({
      model,
      commands: [
        UploadFile.Interrupt({ uploadId }, outcome =>
          Message.CompletedCancelUploadFile({ uploadId, outcome }),
        ),
      ],
    }),
    CompletedCancelUploadFile: ({ uploadId, outcome }) =>
      M.value(outcome).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
          // The upload was stopped. Its result Message will never arrive,
          // so this branch owns the state transition.
          Interrupted: () => ({
            model: evo(model, {
              uploads: setStatusForId(uploadId, 'Cancelled'),
            }),
          }),
          // Nothing held the key: the upload already completed (or never
          // started), and its own result Message handles the Model.
          NotFound: () => ({ model }),
        }),
      ),
    SucceededUploadFile: ({ uploadId }) => ({
      model: evo(model, { uploads: setStatusForId(uploadId, 'Done') }),
    }),
    FailedUploadFile: ({ uploadId }) => ({
      model: evo(model, { uploads: setStatusForId(uploadId, 'Failed') }),
    }),
  })

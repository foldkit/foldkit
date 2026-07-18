import { Array, Effect, Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const ClickedCancelUpload = m('ClickedCancelUpload', { uploadId: S.Number })
const SucceededUploadFile = m('SucceededUploadFile', { uploadId: S.Number })
const FailedUploadFile = m('FailedUploadFile', { uploadId: S.Number })
const CompletedCancelUploadFile = m('CompletedCancelUploadFile', {
  uploadId: S.Number,
  outcome: Command.Interruptible.Outcome,
})

const UploadKey = S.Struct({ uploadId: S.Number })
type UploadKey = typeof UploadKey.Type

const UploadFile = Command.Interruptible.define(
  'UploadFile',
  { ...UploadKey.fields, file: S.instanceOf(File) },
  // The key function maps args to what distinguishes invocations. Foldkit
  // prefixes the Command name automatically, so the full key for upload 7
  // is "UploadFile:7".
  ({ uploadId }: UploadKey) => String(uploadId),
  SucceededUploadFile,
  FailedUploadFile,
)(({ uploadId, file }) =>
  postFile(file).pipe(
    Effect.as(SucceededUploadFile({ uploadId })),
    Effect.catch(() => Effect.succeed(FailedUploadFile({ uploadId }))),
  ),
)

const setStatusForId = (uploadId: number, status: UploadStatus) =>
  Array.map((upload: Upload) =>
    upload.id === uploadId ? evo(upload, { status: () => status }) : upload,
  )

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      // Interrupt only the upload with this uploadId.
      ClickedCancelUpload: ({ uploadId }) => [
        model,
        [
          UploadFile.Interrupt({ uploadId }, outcome =>
            CompletedCancelUploadFile({ uploadId, outcome }),
          ),
        ],
      ],
      CompletedCancelUploadFile: ({ uploadId, outcome }) =>
        M.value(outcome).pipe(
          M.withReturnType<
            readonly [Model, ReadonlyArray<Command.Command<Message>>]
          >(),
          M.tagsExhaustive({
            // The upload was stopped. Its result Message will never arrive,
            // so this branch owns the state transition.
            Interrupted: () => [
              evo(model, { uploads: setStatusForId(uploadId, 'Cancelled') }),
              [],
            ],
            // Nothing held the key: the upload already completed (or never
            // started), and its own result Message handles the Model.
            NotFound: () => [model, []],
          }),
        ),
      SucceededUploadFile: ({ uploadId }) => [
        evo(model, { uploads: setStatusForId(uploadId, 'Done') }),
        [],
      ],
      FailedUploadFile: ({ uploadId }) => [
        evo(model, { uploads: setStatusForId(uploadId, 'Failed') }),
        [],
      ],
    }),
  )

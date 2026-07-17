import { Array, Effect, Match as M, Number, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as Interruptible from '../../command/interruptible/index.js'
import { type Document, html } from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const UploadStatus = S.Literals([
  'Uploading',
  'Done',
  'Cancelled',
  'Failed',
])
export type UploadStatus = typeof UploadStatus.Type

export const Upload = S.Struct({
  id: S.Number,
  status: UploadStatus,
})
export type Upload = typeof Upload.Type

export const Model = S.Struct({
  uploadId: S.Number,
  uploads: S.Array(Upload),
})
export type Model = typeof Model.Type

// MESSAGE

export const ClickedStartUpload = m('ClickedStartUpload')
export const ClickedRetryUpload = m('ClickedRetryUpload', {
  uploadId: S.Number,
})
export const ClickedCancelUpload = m('ClickedCancelUpload', {
  uploadId: S.Number,
})
export const SucceededUploadFile = m('SucceededUploadFile', {
  uploadId: S.Number,
})
export const FailedUploadFile = m('FailedUploadFile', { uploadId: S.Number })
export const CompletedCancelUploadFile = m('CompletedCancelUploadFile', {
  uploadId: S.Number,
  outcome: Interruptible.Outcome,
})

export const Message = S.Union([
  ClickedStartUpload,
  ClickedRetryUpload,
  ClickedCancelUpload,
  SucceededUploadFile,
  FailedUploadFile,
  CompletedCancelUploadFile,
])
export type Message = typeof Message.Type

// COMMAND

export const UploadFileArgs = S.Struct({ uploadId: S.Number })
export type UploadFileArgs = typeof UploadFileArgs.Type

export const UploadFile = Interruptible.define(
  'UploadFile',
  UploadFileArgs.fields,
  ({ uploadId }: UploadFileArgs) => String(uploadId),
  SucceededUploadFile,
  FailedUploadFile,
)(({ uploadId }) => Effect.as(Effect.never, SucceededUploadFile({ uploadId })))

export const CancelUploadFile = ({ uploadId }: UploadFileArgs) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    CompletedCancelUploadFile({ uploadId, outcome }),
  )

// INIT

export const initialModel: Model = { uploadId: 0, uploads: [] }

// UPDATE

const setStatusById = (uploadId: number, status: UploadStatus) =>
  Array.map((upload: Upload) =>
    upload.id === uploadId ? evo(upload, { status: () => status }) : upload,
  )

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedStartUpload: () => {
        const startedUpload: Upload = {
          id: model.uploadId,
          status: 'Uploading',
        }
        return [
          evo(model, {
            uploadId: Number.increment,
            uploads: Array.append(startedUpload),
          }),
          [UploadFile({ uploadId: model.uploadId })],
        ]
      },
      ClickedRetryUpload: ({ uploadId }) => [
        evo(model, { uploads: setStatusById(uploadId, 'Uploading') }),
        [UploadFile({ uploadId })],
      ],
      ClickedCancelUpload: ({ uploadId }) => [
        model,
        [CancelUploadFile({ uploadId })],
      ],
      SucceededUploadFile: ({ uploadId }) => [
        evo(model, { uploads: setStatusById(uploadId, 'Done') }),
        [],
      ],
      FailedUploadFile: ({ uploadId }) => [
        evo(model, { uploads: setStatusById(uploadId, 'Failed') }),
        [],
      ],
      CompletedCancelUploadFile: ({ uploadId, outcome }) =>
        M.value(outcome).pipe(
          M.withReturnType<
            readonly [Model, ReadonlyArray<Command.Command<Message>>]
          >(),
          M.tagsExhaustive({
            Interrupted: () => [
              evo(model, { uploads: setStatusById(uploadId, 'Cancelled') }),
              [],
            ],
            NotFound: () => [model, []],
          }),
        ),
    }),
  )

// VIEW

export const view = (model: Model): Document => {
  const h = html<Message>()

  const body = h.div(
    [],
    [
      h.button([h.OnClick(ClickedStartUpload())], ['Start upload']),
      h.ul(
        [],
        Array.map(model.uploads, upload =>
          h.keyed('li')(
            String(upload.id),
            [],
            [
              h.span([], [`upload ${upload.id}: ${upload.status}`]),
              h.button(
                [h.OnClick(ClickedCancelUpload({ uploadId: upload.id }))],
                [`Cancel upload ${upload.id}`],
              ),
            ],
          ),
        ),
      ),
    ],
  )

  return { title: 'Uploads', body }
}

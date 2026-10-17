import { Array, Number, Option, Schema, pipe } from 'effect'
import { Command } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { CancelUploadFile, UploadFile } from './command'
import { ApplicationComposition } from './composition'
import { Message } from './message'
import { Upload, type UploadStatus } from './model'

export const FakeFile = Schema.Struct({
  name: Schema.String,
  sizeMegabytes: Schema.Number,
})
export type FakeFile = typeof FakeFile.Type

export const FAKE_FILES: Array.NonEmptyReadonlyArray<FakeFile> = [
  { name: 'vacation-photos.zip', sizeMegabytes: 48 },
  { name: 'demo-recording.mp4', sizeMegabytes: 87 },
  { name: 'quarterly-report.pdf', sizeMegabytes: 12 },
  { name: 'design-assets.sketch', sizeMegabytes: 34 },
  { name: 'database-backup.sql', sizeMegabytes: 61 },
]

const fakeFileForUpload = (uploadId: number): FakeFile =>
  pipe(
    FAKE_FILES,
    Array.get(uploadId % Array.length(FAKE_FILES)),
    Option.getOrElse(() => Array.headNonEmpty(FAKE_FILES)),
  )

const setStatusForId = (uploadId: number, status: UploadStatus) =>
  Array.map((upload: Upload) =>
    upload.id === uploadId
      ? modifyFields(upload, { status: () => status })
      : upload,
  )

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedStartUpload: () => {
      const fakeFile = fakeFileForUpload(model.uploadId)
      const startedUpload = Upload.make({
        id: model.uploadId,
        fileName: fakeFile.name,
        sizeMegabytes: fakeFile.sizeMegabytes,
        status: 'Uploading',
      })
      return {
        model: modifyFields(model, {
          uploadId: Number.increment,
          uploads: Array.append(startedUpload),
        }),
        commands: [
          UploadFile({
            uploadId: startedUpload.id,
            sizeMegabytes: startedUpload.sizeMegabytes,
          }),
        ],
      }
    },
    ClickedCancelUpload: ({ uploadId }) => ({
      model,
      commands: [CancelUploadFile({ uploadId })],
    }),
    ClickedCancelAllUploads: () => ({
      model,
      commands: pipe(
        model.uploads,
        Array.filter(upload => upload.status === 'Uploading'),
        Array.map(upload => CancelUploadFile({ uploadId: upload.id })),
      ),
    }),
    ClickedRestartUpload: ({ uploadId }) =>
      pipe(
        model.uploads,
        Array.findFirst(
          upload => upload.id === uploadId && upload.status === 'Cancelled',
        ),
        Option.match({
          onNone: () => ({ model }),
          onSome: upload => ({
            model: modifyFields(model, {
              uploads: setStatusForId(uploadId, 'Uploading'),
            }),
            commands: [
              UploadFile({ uploadId, sizeMegabytes: upload.sizeMegabytes }),
            ],
          }),
        }),
      ),
    CompletedUploadFile: ({ uploadId }) => ({
      model: modifyFields(model, { uploads: setStatusForId(uploadId, 'Done') }),
    }),
    CompletedCancelUploadFile: ({ uploadId, outcome }) =>
      Command.Interruptible.Outcome.match(outcome, {
        Interrupted: () => ({
          model: modifyFields(model, {
            uploads: setStatusForId(uploadId, 'Cancelled'),
          }),
        }),
        NotFound: () => ({ model }),
      }),
  }),
)

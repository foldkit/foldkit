import { Array, Number, Option, Schema, pipe } from 'effect'
import { Command } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { CancelUploadFile, UploadFile } from './command'
import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { Upload, type UploadStatus } from './model'

export const FakeFile = Schema.Struct({
  name: Schema.String,
  sizeMegabytes: Schema.Number,
})

export const FAKE_FILES: Array.NonEmptyReadonlyArray<typeof FakeFile.Type> = [
  { name: 'vacation-photos.zip', sizeMegabytes: 48 },
  { name: 'demo-recording.mp4', sizeMegabytes: 87 },
  { name: 'quarterly-report.pdf', sizeMegabytes: 12 },
  { name: 'design-assets.sketch', sizeMegabytes: 34 },
  { name: 'database-backup.sql', sizeMegabytes: 61 },
]

const fakeFileForUpload = (uploadId: number): typeof FakeFile.Type =>
  pipe(
    FAKE_FILES,
    Array.get(uploadId % Array.length(FAKE_FILES)),
    Option.getOrElse(() => Array.headNonEmpty(FAKE_FILES)),
  )

const setStatusForId = (uploadId: number, status: typeof UploadStatus.Type) =>
  Array.map((upload: typeof Upload.Type) =>
    upload.id === uploadId
      ? modifyFields(upload, { status: () => status })
      : upload,
  )

export const update = ApplicationComposition.makeUpdate({
  ClickedStartUpload: model => {
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
  ClickedCancelUpload: ApplicationDefinition.makeCommandsStep.fromMessage(
    ({ uploadId }) => [CancelUploadFile({ uploadId })],
  ),
  ClickedCancelAllUploads: ApplicationDefinition.makeCommandsStep(model =>
    pipe(
      model.uploads,
      Array.filter(upload => upload.status === 'Uploading'),
      Array.map(upload => CancelUploadFile({ uploadId: upload.id })),
    ),
  ),
  ClickedRestartUpload: (model, { uploadId }) =>
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
  CompletedUploadFile: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ uploadId }) => ({ uploads: setStatusForId(uploadId, 'Done') }),
  ),
  CompletedCancelUploadFile: (model, { uploadId, outcome }) =>
    Command.Interruptible.Outcome.match(outcome, {
      Interrupted: () => ({
        model: modifyFields(model, {
          uploads: setStatusForId(uploadId, 'Cancelled'),
        }),
      }),
      NotFound: () => ({ model }),
    }),
})

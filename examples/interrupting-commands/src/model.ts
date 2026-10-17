import { Schema } from 'effect'

export const UploadStatus = Schema.Literals(['Uploading', 'Done', 'Cancelled'])
export type UploadStatus = typeof UploadStatus.Type

export const Upload = Schema.Struct({
  id: Schema.Number,
  fileName: Schema.String,
  sizeMegabytes: Schema.Number,
  status: UploadStatus,
})
export type Upload = typeof Upload.Type

export const Model = Schema.Struct({
  uploadId: Schema.Number,
  uploads: Schema.Array(Upload),
})
export type Model = typeof Model.Type

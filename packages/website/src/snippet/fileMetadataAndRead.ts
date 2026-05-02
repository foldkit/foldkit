import { Effect } from 'effect'
import { Command, File } from 'foldkit'

const describeFile = (file: File.File): string =>
  `${File.name(file)} (${File.mimeType(file)}, ${File.size(file)} bytes)`

const ReadAvatarPreview = Command.define(
  'ReadAvatarPreview',
  SucceededReadAvatarPreview,
  FailedReadAvatarPreview,
)

const readAvatarPreview = (file: File.File) =>
  ReadAvatarPreview(
    File.readAsDataUrl(file).pipe(
      Effect.map(dataUrl => SucceededReadAvatarPreview({ dataUrl })),
      Effect.catch(error =>
        Effect.succeed(FailedReadAvatarPreview({ reason: error.reason })),
      ),
    ),
  )

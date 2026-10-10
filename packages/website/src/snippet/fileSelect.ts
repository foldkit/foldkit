import { Effect, Option } from 'effect'
import { Command, File } from 'foldkit'

const SelectResume = Command.define('SelectResume', {
  messages: [CompletedSelectResume, CancelledSelectResume],
})

const SelectResumeLayer = SelectResume.toLayer(
  Effect.succeed(() =>
    File.select(['application/pdf']).pipe(
      Effect.map(
        Option.match({
          onNone: () => CancelledSelectResume(),
          onSome: file => CompletedSelectResume({ file }),
        }),
      ),
    ),
  ),
)

const SelectAttachments = Command.define('SelectAttachments', {
  messages: [CompletedSelectAttachments],
})

const SelectAttachmentsLayer = SelectAttachments.toLayer(
  Effect.succeed(() =>
    File.selectMultiple(['image/*', 'application/pdf']).pipe(
      Effect.map(files => CompletedSelectAttachments({ files })),
    ),
  ),
)

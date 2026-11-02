import { Effect, Option } from 'effect'
import { Command, File } from 'foldkit'

const SelectResume = Command.define('SelectResume', {
  messages: [CompletedSelectResume, CancelledSelectResume],
})

const SelectResumeLive = SelectResume.toLayer(
  Effect.gen(function* () {
    return () =>
      File.select(['application/pdf']).pipe(
        Effect.map(
          Option.match({
            onNone: () => CancelledSelectResume(),
            onSome: file => CompletedSelectResume({ file }),
          }),
        ),
      )
  }),
)

const SelectAttachments = Command.define('SelectAttachments', {
  messages: [CompletedSelectAttachments],
})

const SelectAttachmentsLive = SelectAttachments.toLayer(
  Effect.gen(function* () {
    return () =>
      File.selectMultiple(['image/*', 'application/pdf']).pipe(
        Effect.map(files => CompletedSelectAttachments({ files })),
      )
  }),
)

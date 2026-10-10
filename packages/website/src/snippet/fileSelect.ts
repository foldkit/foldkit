import { Effect, Option } from 'effect'
import { Command, File } from 'foldkit'

const SelectResume = Command.define(
  'SelectResume',
  {
    messages: [CompletedSelectResume, CancelledSelectResume],
  },
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

const SelectAttachments = Command.define(
  'SelectAttachments',
  {
    messages: [CompletedSelectAttachments],
  },
  Effect.succeed(() =>
    File.selectMultiple(['image/*', 'application/pdf']).pipe(
      Effect.map(files => CompletedSelectAttachments({ files })),
    ),
  ),
)

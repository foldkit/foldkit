import { Effect, Option } from 'effect'
import { Command, File } from 'foldkit'

const SelectResume = Command.define(
  'SelectResume',
  SelectedResume,
  CancelledSelectResume,
)(
  File.select(['application/pdf']).pipe(
    Effect.map(
      Option.match({
        onNone: () => CancelledSelectResume(),
        onSome: file => SelectedResume({ file }),
      }),
    ),
  ),
)

const SelectAttachments = Command.define(
  'SelectAttachments',
  SelectedAttachments,
)(
  File.selectMultiple(['image/*', 'application/pdf']).pipe(
    Effect.map(files => SelectedAttachments({ files })),
  ),
)

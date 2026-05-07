import { Effect } from 'effect'
import { Command, File } from 'foldkit'

const SelectResume = Command.define(
  'SelectResume',
  SelectedResume,
)(
  File.select(['application/pdf']).pipe(
    Effect.map(files => SelectedResume({ files })),
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

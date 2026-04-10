import { Effect } from 'effect'
import { Command, File } from 'foldkit'

const SelectResume = Command.define('SelectResume', SelectedResume)

const selectResume = SelectResume(
  File.select(['application/pdf']).pipe(
    Effect.map(files => SelectedResume({ files })),
  ),
)

const SelectAttachments = Command.define(
  'SelectAttachments',
  SelectedAttachments,
)

const selectAttachments = SelectAttachments(
  File.selectMultiple(['image/*', 'application/pdf']).pipe(
    Effect.map(files => SelectedAttachments({ files })),
  ),
)

import { Option, Record, pipe } from 'effect'
import { makeInitIfMissingStep } from 'foldkit/binding'

import { EntriesByIdBinding } from './blockKeyedMapFields'

const initDraftCopyIfMissing = makeInitIfMissingStep(
  EntriesByIdBinding,
  model =>
    pipe(
      Record.get(model.entriesById, 'draft'),
      Option.map(entry => ({
        key: 'draft-copy',
        args: [`Copy of ${entry.title}`],
      })),
    ),
)

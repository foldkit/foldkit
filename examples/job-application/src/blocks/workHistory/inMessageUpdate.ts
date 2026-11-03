import { Array } from 'effect'
import { Update } from 'foldkit'

import { EntriesBinding, WorkHistoryComposition } from './composition'

export const inMessageUpdate = WorkHistoryComposition.makeInMessageUpdate({
  RequestedRevealErrors: model =>
    Update.combineSteps(
      model,
      Array.map(model.entries, entry =>
        EntriesBinding.requestRevealErrors(entry.id),
      ),
    ),
})

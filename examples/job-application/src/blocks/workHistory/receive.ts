import { Array } from 'effect'
import { Update } from 'foldkit'

import { EntriesBinding, WorkHistoryComposition } from './composition'

export const receive = WorkHistoryComposition.makeReceive({
  RequestedRevealErrors: model =>
    Update.combineSteps(
      model,
      Array.map(model.entries, entry =>
        EntriesBinding.requestRevealErrors(entry.id),
      ),
    ),
})

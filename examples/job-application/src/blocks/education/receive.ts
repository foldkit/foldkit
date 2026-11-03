import { Array } from 'effect'
import { Update } from 'foldkit'

import { EducationComposition, EntriesBinding } from './composition'

export const receive = EducationComposition.makeReceive({
  RequestedRevealErrors: model =>
    Update.combineSteps(
      model,
      Array.map(model.entries, entry =>
        EntriesBinding.requestRevealErrors(entry.id),
      ),
    ),
})

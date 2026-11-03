import { Array } from 'effect'
import { Update } from 'foldkit'

import { EducationComposition, EntriesBinding } from './composition'

export const inMessageUpdate = EducationComposition.makeInMessageUpdate({
  RequestedRevealErrors: model =>
    Update.combineSteps(
      model,
      Array.map(model.entries, entry =>
        EntriesBinding.requestRevealErrors(entry.id),
      ),
    ),
})

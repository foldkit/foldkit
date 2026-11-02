import { Array } from 'effect'
import { Update } from 'foldkit'

import { EntriesBinding, SkillsComposition } from './composition'

export const receive = SkillsComposition.makeReceive({
  RequestedRevealErrors: model =>
    Update.combineSteps(
      model,
      Array.map(model.entries, entry =>
        EntriesBinding.requestRevealErrors(entry.id),
      ),
    ),
})

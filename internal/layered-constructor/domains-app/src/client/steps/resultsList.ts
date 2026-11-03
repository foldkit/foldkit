import { Array, pipe } from 'effect'
import { initAndSet } from 'foldkit/bindingInit'

import { ResultsListBinding } from '../composition'
import { makeStep } from '../definition'
import { resultListings } from '../resultListings'
import { groupDomainListings, resultsListConfig } from '../resultsList'

export const informResultsList = makeStep(model =>
  ResultsListBinding.informItemsChanged(
    pipe(
      model,
      resultListings,
      groupDomainListings,
      Array.map(row => row.id),
    ),
  ),
)

export const resetResultsList = makeStep(model =>
  initAndSet(ResultsListBinding, model, { args: [resultsListConfig] }),
)

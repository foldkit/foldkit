import { Update } from 'foldkit'

import { makeCommandsStep, makeStep } from './block'
import { clearSearchQuery } from './clear'
import { FocusSearchInput } from './command'
import { DialogBinding, SearchComposition } from './composition'

const open = makeStep(() =>
  Update.combineSteps([
    DialogBinding.requestOpen(),
    makeCommandsStep(() => [FocusSearchInput()]),
  ]),
)

export const inMessageUpdate = SearchComposition.makeInMessageUpdate({
  RequestedOpen: open,
  InformedOfRouteChange: Update.combineSteps([
    clearSearchQuery,
    DialogBinding.requestClose(),
  ]),
})

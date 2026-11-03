import { Update } from 'foldkit'

import { clearSearchQuery } from './clear'
import { FocusSearchInput } from './command'
import { DialogBinding, SearchComposition } from './composition'
import { makeCommandsStep, makeStep } from './definition'

const focusSearchInput = makeCommandsStep(() => [FocusSearchInput()])

const open = makeStep(() =>
  Update.combineSteps([DialogBinding.requestOpen(), focusSearchInput]),
)

export const receive = SearchComposition.makeReceive({
  RequestedOpen: open,
  InformedOfRouteChange: Update.combineSteps([
    clearSearchQuery,
    DialogBinding.requestClose(),
  ]),
})

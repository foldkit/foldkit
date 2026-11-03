import type { Block } from 'foldkit'

import { DialogBlock } from '@foldkit/ui/dialog'

import { clearSearchQuery } from './clear'
import { SearchDefinition, makeNoopStep } from './definition'

export const DialogBinding = SearchDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'search-dialog' }] },
}).withOutMessagePolicy({
  fold: SearchDefinition.makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: () => clearSearchQuery,
  }),
})

export const SearchComposition = SearchDefinition.makeComposition({
  bindings: [DialogBinding],
})
export type SearchViewBuilder = Block.ViewBuilderFor<typeof SearchComposition>

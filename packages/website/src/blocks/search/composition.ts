import type { Block } from 'foldkit'

import { DialogBlock } from '@foldkit/ui/dialog'

import { clearSearchQuery } from './clear'
import { SearchBlock, makeNoopStep } from './definition'

export const DialogBinding = SearchBlock.makeBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'search-dialog' }] },
}).withOutMessagePolicy({
  fold: SearchBlock.makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: () => clearSearchQuery,
  }),
})

export const SearchComposition = SearchBlock.makeComposition({
  bindings: [DialogBinding],
})
export type SearchViewBuilder = Block.ViewBuilderFor<typeof SearchComposition>

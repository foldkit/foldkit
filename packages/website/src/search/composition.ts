import { Tuple } from 'effect'
import type { Block } from 'foldkit'

import { DialogBlock } from '@foldkit/ui'

import { clearSearchQueryStep } from './clear'
import { SearchDefinition, makeNoopStep } from './definition'

export const DialogBinding = SearchDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => Tuple.make({ id: 'search-dialog' }) },
}).withOutMessagePolicy({
  fold: SearchDefinition.makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: () => clearSearchQueryStep,
  }),
})

export const SearchComposition = SearchDefinition.makeComposition({
  bindings: [DialogBinding],
})
export type SearchViewBuilder = Block.ViewBuilderFor<typeof SearchComposition>

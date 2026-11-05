import type { Block } from 'foldkit'

import { DialogBlock } from '@foldkit/ui/dialog'

import {
  makeBinding,
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
} from './block'
import { clearSearchQuery } from './clear'

export const DialogBinding = makeBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'search-dialog' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: () => clearSearchQuery,
  }),
})

export const SearchComposition = makeComposition({
  bindings: [DialogBinding],
})
export type SearchViewBuilder = Block.ViewBuilderFor<typeof SearchComposition>

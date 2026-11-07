import type { Block } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import {
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'
import { clearSearchQuery } from './clear'

export const DialogBinding = makeRequiredFieldBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'search-dialog' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: () => clearSearchQuery,
  }),
})

export const SearchComposition = makeComposition({
  bindings: [DialogBinding],
})
export type SearchViewBuilder = Block.ViewBuilderFor<typeof SearchComposition>

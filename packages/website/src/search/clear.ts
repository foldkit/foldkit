import { modifyFields } from 'foldkit/struct'

import { SearchState } from './domain'
import type { Model } from './model'

export const clearSearchQueryStep = (model: Model) => ({
  model: modifyFields(model, {
    query: () => '',
    searchState: () => SearchState.Idle(),
    activeResultIndex: () => -1,
  }),
})

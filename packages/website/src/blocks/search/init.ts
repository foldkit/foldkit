import { SearchComposition } from './composition'
import { SearchState } from './domain'

export const init = SearchComposition.makeInit(() => ({
  model: {
    query: '',
    searchState: SearchState.Idle(),
    activeResultIndex: -1,
  },
}))

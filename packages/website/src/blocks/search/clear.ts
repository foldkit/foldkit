import { makeFieldsStep } from './block'
import { SearchState } from './domain'

export const clearSearchQuery = makeFieldsStep(() => ({
  query: () => '',
  searchState: () => SearchState.Idle(),
  activeResultIndex: () => -1,
}))

import { makeFieldsStep } from './definition'
import { SearchState } from './domain'

export const clearSearchQueryStep = makeFieldsStep(() => ({
  query: () => '',
  searchState: () => SearchState.Idle(),
  activeResultIndex: () => -1,
}))

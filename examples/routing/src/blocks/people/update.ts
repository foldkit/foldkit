import { Option } from 'effect'

import type { PeopleRoute } from '../../route'
import { makeCommandsStep, makeFieldsStep, makeNoopStep } from './block'
import { FetchPeople, PushSearchUrl } from './command'
import { PeopleComposition } from './composition'
import {
  Model,
  SearchResults,
  addSearchToHistory,
  routeSearchText,
} from './model'

export const init = PeopleComposition.makeInit((route: PeopleRoute) => {
  const searchText = routeSearchText(route)
  return {
    model: Model.make({
      searchInput: searchText,
      searchHistory: addSearchToHistory([], searchText),
      results: SearchResults.Loading(),
    }),
    commands: [FetchPeople({ searchText })],
  }
})
export const update = PeopleComposition.makeUpdate({
  ChangedSearchInput: makeFieldsStep.fromMessage(({ value }) => ({
    searchInput: () => value,
  })),

  SubmittedSearch: makeCommandsStep(model => [
    PushSearchUrl({
      searchText: Option.fromNullishOr(model.searchInput || null),
    }),
  ]),

  CompletedFetchPeople: makeFieldsStep.fromMessage(
    ({ query, people: fetchedPeople }) => ({
      results: () => SearchResults.Loaded({ query, people: fetchedPeople }),
    }),
  ),

  CompletedPushSearchUrl: makeNoopStep(),
})

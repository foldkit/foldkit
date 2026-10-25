import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import type { ApplicationRoute } from '../../route'
import { FetchPeople, PushSearchUrl } from './command'
import { PeopleComposition } from './composition'
import { PeopleDefinition } from './definition'
import {
  Model,
  SearchResults,
  addSearchToHistory,
  routeSearchText,
} from './model'

export const init = PeopleComposition.makeInit(
  (route: typeof ApplicationRoute.People.Type) => {
    const searchText = routeSearchText(route)
    return {
      model: Model.make({
        searchInput: searchText,
        searchHistory: addSearchToHistory([], searchText),
        results: SearchResults.Loading(),
      }),
      commands: [FetchPeople({ searchText })],
    }
  },
)
export const update = PeopleComposition.makeUpdate({
  ChangedSearchInput: PeopleDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ searchInput: () => value }),
  ),

  SubmittedSearch: PeopleDefinition.makeCommandsStep(model => [
    PushSearchUrl({
      searchText: Option.fromNullishOr(model.searchInput || null),
    }),
  ]),

  InformedOfRouteChange: (model, { route }) => {
    const searchText = routeSearchText(route)
    return {
      model: modifyFields(model, {
        searchInput: () => searchText,
        searchHistory: searchHistory =>
          addSearchToHistory(searchHistory, searchText),
        results: () => SearchResults.Loading(),
      }),
      commands: [FetchPeople({ searchText })],
    }
  },

  CompletedFetchPeople: PeopleDefinition.makeFieldsStep.fromMessage(
    ({ query, people: fetchedPeople }) => ({
      results: () => SearchResults.Loaded({ query, people: fetchedPeople }),
    }),
  ),

  CompletedPushSearchUrl: PeopleDefinition.makeNoopStep(),
})

import { FetchPeople } from './informingBlocksCommand'
import { PeopleComposition } from './informingBlocksDefinition'
import {
  Model,
  SearchResults,
  addSearchToHistory,
  routeSearchText,
} from './informingBlocksModel'
import type { PeopleRoute } from './informingBlocksRoute'

export const init = PeopleComposition.makeInit((route: PeopleRoute) => {
  const searchText = routeSearchText(route.searchText)

  return {
    model: Model.make({
      searchInput: searchText,
      searchHistory: addSearchToHistory([], searchText),
      results: SearchResults.Loading(),
    }),
    commands: [FetchPeople({ searchText })],
  }
})

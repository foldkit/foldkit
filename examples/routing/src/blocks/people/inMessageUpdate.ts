import { modifyFields } from 'foldkit/struct'

import { FetchPeople } from './command'
import { PeopleComposition } from './composition'
import { SearchResults, addSearchToHistory, routeSearchText } from './model'

export const inMessageUpdate = PeopleComposition.makeInMessageUpdate({
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
})

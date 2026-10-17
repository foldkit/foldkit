import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { type PeopleRoute } from '../../route'
import { FetchPeople, PushSearchUrl } from './command'
import { People, PeopleComposition } from './definition'
import { Message } from './message'
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
export const update = PeopleComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ChangedSearchInput: ({ value }) => ({
      model: modifyFields(model, { searchInput: () => value }),
    }),

    SubmittedSearch: () => ({
      model,
      commands: [
        PushSearchUrl({
          searchText: Option.fromNullishOr(model.searchInput || null),
        }),
      ],
    }),

    ChangedRoute: ({ route }) => {
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

    CompletedFetchPeople: ({ query, people: fetchedPeople }) => ({
      model: modifyFields(model, {
        results: () => SearchResults.Loaded({ query, people: fetchedPeople }),
      }),
    }),

    CompletedPushSearchUrl: () => ({ model }),
  }),
)

/** Tells the People page that the route changed. People does not own the
 *  route; it derives its own state (the search input and history) from the new
 *  route and returns the refetch Command. The parent calls this from its
 *  `ChangedUrl` handler. Contrast a `reflect*` setter, which writes a field the
 *  Block owns from an external value, with no derivation and no Command. */
export const informRouteChanged = People.step((model, route: PeopleRoute) =>
  update(model, Message.ChangedRoute({ route })),
)

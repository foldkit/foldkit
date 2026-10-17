import { modifyFields } from 'foldkit/struct'

import { FetchPeople } from './informingBlocksCommand'
import { People, PeopleComposition } from './informingBlocksDefinition'
import { init } from './informingBlocksInit'
import { Message } from './informingBlocksMessage'
import {
  SearchResults,
  addSearchToHistory,
  routeSearchText,
} from './informingBlocksModel'
import { type PeopleRoute } from './informingBlocksRoute'

export const informRouteChanged = People.step((model, route: PeopleRoute) => {
  const searchText = routeSearchText(route.searchText)

  return {
    model: modifyFields(model, {
      searchInput: () => searchText,
      searchHistory: history => addSearchToHistory(history, searchText),
      results: () => SearchResults.Loading(),
    }),
    commands: [FetchPeople({ searchText })],
  }
})

export const update = PeopleComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ChangedRoute: ({ route }) => informRouteChanged(model, route),
    CompletedFetchPeople: ({ query, people }) => ({
      model: modifyFields(model, {
        results: () => SearchResults.Loaded({ query, people }),
      }),
    }),
  }),
)

export const block = PeopleComposition.makeBlock({
  init,
  update,
  expose: { informRouteChanged },
  EffectsLayer: FetchPeople.layer,
})

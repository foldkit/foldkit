import { Effect } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { FetchPeople } from './informingBlocksCommand'
import { PeopleBlock, PeopleComposition } from './informingBlocksDefinition'
import { init } from './informingBlocksInit'
import {
  SearchResults,
  addSearchToHistory,
  routeSearchText,
} from './informingBlocksModel'

export const update = PeopleComposition.makeUpdate({
  CompletedFetchPeople: (model, { query, people }) => ({
    model: modifyFields(model, {
      results: () => SearchResults.Loaded({ query, people }),
    }),
  }),
})

export const inMessageUpdate = PeopleComposition.makeInMessageUpdate({
  InformedOfRouteChange: (model, { route }) => {
    const searchText = routeSearchText(route.searchText)

    return {
      model: modifyFields(model, {
        searchInput: () => searchText,
        searchHistory: history => addSearchToHistory(history, searchText),
        results: () => SearchResults.Loading(),
      }),
      commands: [FetchPeople({ searchText })],
    }
  },
})

export const layer = PeopleBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      inMessageUpdate,
      EffectsLayer: FetchPeople.layer,
    }
  }),
)

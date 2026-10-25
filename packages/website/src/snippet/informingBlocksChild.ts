import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FetchPeople } from './informingBlocksCommand'
import { PeopleComposition } from './informingBlocksDefinition'
import { init } from './informingBlocksInit'
import { Message } from './informingBlocksMessage'
import type { Model } from './informingBlocksModel'
import {
  SearchResults,
  addSearchToHistory,
  routeSearchText,
} from './informingBlocksModel'

export const informRouteChanged = Message.InformedOfRouteChange

export const update = PeopleComposition.makeUpdate({
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
  CompletedFetchPeople: (model, { query, people }) => ({
    model: modifyFields(model, {
      results: () => SearchResults.Loaded({ query, people }),
    }),
  }),
})

const prepare = () =>
  PeopleComposition.prepareBlock({
    init,
    update,
    operations: { informRouteChanged },
    EffectsLayer: FetchPeople.layer,
  })
export const PeopleBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

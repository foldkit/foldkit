import { Effect } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FetchPeople } from './informingBlocksCommand'
import { Message } from './informingBlocksMessage'
import {
  Model,
  SearchResults,
  addSearchToHistory,
  routeSearchText,
} from './informingBlocksModel'
import type { PeopleRoute } from './informingBlocksRoute'
import { PeopleDirectory } from './informingBlocksService'

export class People extends Block<People, Readonly<{ route: PeopleRoute }>>()(
  'People',
  { Model, Message, Command: [FetchPeople] },
) {}

export const PeopleLive = People.make(
  Effect.fn(function* (_id, { route }) {
    const directory = yield* PeopleDirectory
    const searchText = routeSearchText(route.searchText)

    return {
      model: {
        searchInput: searchText,
        searchHistory: addSearchToHistory([], searchText),
        results: SearchResults.Loading(),
      },

      start: [FetchPeople({ searchText })],

      update: {
        InformedOfRouteChange: (model, { route: nextRoute }) => {
          const nextSearchText = routeSearchText(nextRoute.searchText)

          return {
            model: modifyFields(model, {
              searchInput: () => nextSearchText,
              searchHistory: searchHistory =>
                addSearchToHistory(searchHistory, nextSearchText),
              results: () => SearchResults.Loading(),
            }),
            commands: [FetchPeople({ searchText: nextSearchText })],
          }
        },
        CompletedFetchPeople: (model, { query, people }) => ({
          model: modifyFields(model, {
            results: () => SearchResults.Loaded({ query, people }),
          }),
        }),
      },

      commands: {
        FetchPeople: ({ searchText: query }) =>
          directory
            .search(query)
            .pipe(
              Effect.map(people =>
                Message.CompletedFetchPeople({ query, people }),
              ),
            ),
      },
    }
  }),
)

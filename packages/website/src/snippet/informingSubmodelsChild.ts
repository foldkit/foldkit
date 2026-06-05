import { Match as M, Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { PeopleRoute } from '../route'

// MESSAGE

const Person = S.Struct({ id: S.Number, name: S.String, role: S.String })

const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })
const SubmittedSearch = m('SubmittedSearch')
const ChangedRoute = m('ChangedRoute', { route: PeopleRoute })
const SucceededFetchPeople = m('SucceededFetchPeople', {
  query: S.String,
  people: S.Array(Person),
})

export const Message = S.Union([
  ChangedSearchInput,
  SubmittedSearch,
  ChangedRoute,
  SucceededFetchPeople,
])
export type Message = typeof Message.Type

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedSearchInput: ({ value }) => [
        evo(model, { searchInput: () => value }),
        [],
      ],

      SubmittedSearch: () => [
        model,
        [
          PushSearchUrl({
            searchText: Option.fromNullishOr(model.searchInput || null),
          }),
        ],
      ],

      ChangedRoute: ({ route }) => {
        const searchText = Option.getOrElse(route.searchText, () => '')
        return [
          evo(model, {
            searchInput: () => searchText,
            searchHistory: searchHistory =>
              addSearchToHistory(searchHistory, searchText),
            results: () => SearchLoading(),
          }),
          [FetchPeople({ searchText })],
        ]
      },

      SucceededFetchPeople: ({ query, people }) => [
        evo(model, { results: () => SearchLoaded({ query, people }) }),
        [],
      ],
    }),
  )

export const informRouteChanged = (model: Model, route: PeopleRoute) =>
  update(model, ChangedRoute({ route }))

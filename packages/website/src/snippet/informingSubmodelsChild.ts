import { Option, Schema, String } from 'effect'
import { type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { PeopleRoute } from './route'

// MESSAGE

const Person = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  role: Schema.String,
})

export const Message = defineMessageUnion({
  ChangedSearchInput: { value: Schema.String },
  SubmittedSearch: {},
  ChangedRoute: { route: PeopleRoute },
  SucceededFetchPeople: {
    query: Schema.String,
    people: Schema.Array(Person),
  },
})
export type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedSearchInput: ({ value }) => ({
      model: evo(model, { searchInput: () => value }),
    }),

    SubmittedSearch: () => ({
      model,
      commands: [
        PushSearchUrl({
          searchText: Option.liftPredicate(
            model.searchInput,
            String.isNonEmpty,
          ),
        }),
      ],
    }),

    ChangedRoute: ({ route }) => {
      const searchText = Option.getOrElse(route.searchText, () => '')
      return {
        model: evo(model, {
          searchInput: () => searchText,
          searchHistory: searchHistory =>
            addSearchToHistory(searchHistory, searchText),
          results: () => SearchLoading(),
        }),
        commands: [FetchPeople({ searchText })],
      }
    },

    SucceededFetchPeople: ({ query, people }) => ({
      model: evo(model, { results: () => SearchLoaded({ query, people }) }),
    }),
  })

export const informRouteChanged = (model: Model, route: PeopleRoute) =>
  update(model, Message.ChangedRoute({ route }))

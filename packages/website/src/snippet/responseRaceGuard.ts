import { Effect, Schema, pipe } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { AsyncData, Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const SearchResult = Schema.Struct({ id: Schema.String, title: Schema.String })

const SearchResultsData = AsyncData.Schema(
  Schema.Array(SearchResult),
  Schema.String,
)

// MODEL

const Model = Schema.Struct({
  queryInput: Schema.String,
  searchResults: SearchResultsData.schema,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
  SettledSearch: {
    query: Schema.String,
    result: Schema.Result(Schema.Array(SearchResult), Schema.String),
  },
})
type Message = typeof Message.Type

// COMMAND

const Search = Command.define('Search', {
  args: { query: Schema.String },
  messages: [Message.SettledSearch],
})

const SearchLayer = Search.toLayer(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return ({ query }) =>
      pipe(
        Effect.gen(function* () {
          const request = HttpClientRequest.get('/api/search').pipe(
            HttpClientRequest.setUrlParams({ q: query }),
          )
          const response = yield* client.execute(request)
          return yield* Schema.decodeUnknownEffect(Schema.Array(SearchResult))(
            yield* response.json,
          )
        }),
        Effect.mapError(error => String(error)),
        Effect.result,
        Effect.map(result => Message.SettledSearch({ query, result })),
      )
  }),
)

// UPDATE

const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    UpdatedQuery: ({ query }) => ({
      model: modifyFields(model, {
        queryInput: () => query,
        searchResults: () => SearchResultsData.Loading(),
      }),
      commands: [Search({ query })],
    }),

    SettledSearch: ({ query, result }) => {
      if (query !== model.queryInput) {
        return { model }
      }
      return {
        model: modifyFields(model, { searchResults: AsyncData.settle(result) }),
      }
    },
  }),
)

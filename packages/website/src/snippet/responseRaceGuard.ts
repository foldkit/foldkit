import { Effect, Schema, pipe } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { AsyncData, Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const SearchResult = Schema.Struct({ id: Schema.String, title: Schema.String })
type SearchResult = typeof SearchResult.Type

const SearchResultsData = AsyncData.Schema(
  Schema.Array(SearchResult),
  Schema.String,
)
type SearchResultsData = typeof SearchResultsData.schema.Type
const Model = Schema.Struct({
  queryInput: Schema.String,
  searchResults: SearchResultsData.schema,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
  SettledSearch: {
    query: Schema.String,
    result: Schema.Result(Schema.Array(SearchResult), Schema.String),
  },
})
type Message = typeof Message.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ApplicationComposition = ApplicationDefinition.makeComposition()

const Search = ApplicationDefinition.makeCommand('Search', {
  args: { query: Schema.String },
  messages: [Message.SettledSearch],
  handler: function* () {
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
  },
})

const update = ApplicationComposition.makeUpdate({
  UpdatedQuery: (model, { query }) => ({
    model: modifyFields(model, {
      queryInput: () => query,
      searchResults: () => SearchResultsData.Loading(),
    }),
    commands: [Search({ query })],
  }),

  SettledSearch: (model, { query, result }) => {
    if (query !== model.queryInput) {
      return { model }
    }
    return {
      model: modifyFields(model, { searchResults: AsyncData.settle(result) }),
    }
  },
})

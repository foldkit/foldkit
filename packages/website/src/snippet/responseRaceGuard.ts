import { Effect, Schema, pipe } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { AsyncData, Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const SearchResult = Schema.Struct({ id: Schema.String, title: Schema.String })
type SearchResult = typeof SearchResult.Type

const SearchResultsData = AsyncData.Schema(
  Schema.Array(SearchResult),
  Schema.String,
)

const Message = defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
  CompletedSearch: {
    query: Schema.String,
    result: Schema.Result(Schema.Array(SearchResult), Schema.String),
  },
})

const Search = Command.define('Search', {
  args: { query: Schema.String },
  messages: [Message.CompletedSearch],
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({
    queryInput: Schema.String,
    searchResults: SearchResultsData.schema,
  }),
  Message,
  Command: [Search],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const client = yield* HttpClient.HttpClient

    return {
      model: { queryInput: '', searchResults: SearchResultsData.Idle() },
      update: {
        UpdatedQuery: (model, { query }) => ({
          model: modifyFields(model, {
            queryInput: () => query,
            searchResults: () => SearchResultsData.Loading(),
          }),
          commands: [Search({ query })],
        }),

        CompletedSearch: (model, { query, result }) => {
          if (query !== model.queryInput) {
            return { model }
          }

          return {
            model: modifyFields(model, {
              searchResults: AsyncData.settle(result),
            }),
          }
        },
      },
      commands: {
        Search: ({ query }) =>
          pipe(
            Effect.gen(function* () {
              const request = HttpClientRequest.get('/api/search').pipe(
                HttpClientRequest.setUrlParams({ q: query }),
              )
              const response = yield* client.execute(request)
              return yield* Schema.decodeUnknownEffect(
                Schema.Array(SearchResult),
              )(yield* response.json)
            }),
            Effect.mapError(error => String(error)),
            Effect.result,
            Effect.map(result => Message.CompletedSearch({ query, result })),
          ),
      },
    }
  }),
)

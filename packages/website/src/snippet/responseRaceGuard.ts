import { Effect, Schema as S, pipe } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { AsyncData, Command, Http, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const SearchResult = S.Struct({ id: S.String, title: S.String })

const SearchResultsData = AsyncData.Schema(S.Array(SearchResult), S.String)

// MODEL

const Model = S.Struct({
  queryInput: S.String,
  searchResults: SearchResultsData.schema,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  UpdatedQuery: { query: S.String },
  SettledSearch: {
    query: S.String,
    result: S.Result(S.Array(SearchResult), S.String),
  },
})
type Message = typeof Message.Type

// COMMAND

const Search = Command.define('Search', {
  args: { query: S.String },
  messages: [Message.SettledSearch],
  execute: ({ query }) =>
    pipe(
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient
        const request = HttpClientRequest.get('/api/search').pipe(
          HttpClientRequest.setUrlParams({ q: query }),
        )
        const response = yield* client.execute(request)
        return yield* S.decodeUnknownEffect(S.Array(SearchResult))(
          yield* response.json,
        )
      }),
      Effect.mapError(error => String(error)),
      Effect.result,
      Effect.map(result => Message.SettledSearch({ query, result })),
      Effect.provide(Http.layer),
    ),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedQuery: ({ query }) => ({
      model: evo(model, {
        queryInput: () => query,
        searchResults: () => SearchResultsData.Loading(),
      }),
      commands: [Search({ query })],
    }),

    SettledSearch: ({ query, result }) => {
      if (query !== model.queryInput) {
        return { model }
      }
      return { model: evo(model, { searchResults: AsyncData.settle(result) }) }
    },
  })

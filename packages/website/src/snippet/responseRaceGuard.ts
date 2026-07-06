import { Effect, Match as M, Schema as S, pipe } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { AsyncData, Command, Http } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const SearchResult = S.Struct({ id: S.String, title: S.String })

const SearchResultsData = AsyncData.Schema(S.Array(SearchResult), S.String)

// MODEL

const Model = S.Struct({
  queryInput: S.String,
  searchResults: SearchResultsData.schema,
  latestRequestId: S.Number,
})
type Model = typeof Model.Type

// MESSAGE

const ChangedQuery = m('ChangedQuery', { query: S.String })
const SettledSearch = m('SettledSearch', {
  requestId: S.Number,
  result: S.Result(S.Array(SearchResult), S.String),
})

const Message = S.Union([ChangedQuery, SettledSearch])
type Message = typeof Message.Type

// COMMAND

const Search = Command.define(
  'Search',
  { requestId: S.Number, query: S.String },
  SettledSearch,
)(({ requestId, query }) =>
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
    Effect.map(result => SettledSearch({ requestId, result })),
    Effect.provide(Http.layer),
  ),
)

// UPDATE

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ChangedQuery: ({ query }) => {
        const requestId = model.latestRequestId + 1

        return [
          evo(model, {
            queryInput: () => query,
            searchResults: () => SearchResultsData.Loading(),
            latestRequestId: () => requestId,
          }),
          [Search({ requestId, query })],
        ]
      },

      SettledSearch: ({ requestId, result }) => {
        if (requestId !== model.latestRequestId) {
          return [model, []]
        }
        return [evo(model, { searchResults: AsyncData.settle(result) }), []]
      },
    }),
  )

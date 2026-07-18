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
})
type Model = typeof Model.Type

// MESSAGE

const ChangedQuery = m('ChangedQuery', { query: S.String })
const SettledSearch = m('SettledSearch', {
  query: S.String,
  result: S.Result(S.Array(SearchResult), S.String),
})

const Message = S.Union([ChangedQuery, SettledSearch])
type Message = typeof Message.Type

// COMMAND

const Search = Command.define(
  'Search',
  { query: S.String },
  SettledSearch,
)(({ query }) =>
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
    Effect.map(result => SettledSearch({ query, result })),
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
      ChangedQuery: ({ query }) => [
        evo(model, {
          queryInput: () => query,
          searchResults: () => SearchResultsData.Loading(),
        }),
        [Search({ query })],
      ],

      SettledSearch: ({ query, result }) => {
        if (query !== model.queryInput) {
          return [model, []]
        }
        return [evo(model, { searchResults: AsyncData.settle(result) }), []]
      },
    }),
  )

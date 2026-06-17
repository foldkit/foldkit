import { Effect, Match as M, Schema as S } from 'effect'
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from 'effect/unstable/http'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const Result = S.Struct({ id: S.String, title: S.String })

const ResultsLoading = ts('ResultsLoading')
const ResultsOk = ts('ResultsOk', { results: S.Array(Result) })
const ResultsFailure = ts('ResultsFailure', { error: S.String })
const Results = S.Union([ResultsLoading, ResultsOk, ResultsFailure])

// MODEL

const Model = S.Struct({
  queryInput: S.String,
  results: Results,
  latestRequestId: S.Number,
})
type Model = typeof Model.Type

// MESSAGE

const ChangedQuery = m('ChangedQuery', { query: S.String })
const SucceededSearch = m('SucceededSearch', {
  requestId: S.Number,
  results: S.Array(Result),
})
const FailedSearch = m('FailedSearch', {
  requestId: S.Number,
  error: S.String,
})

const Message = S.Union([ChangedQuery, SucceededSearch, FailedSearch])
type Message = typeof Message.Type

// COMMAND

const Search = Command.define(
  'Search',
  { requestId: S.Number, query: S.String },
  SucceededSearch,
  FailedSearch,
)(({ requestId, query }) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = HttpClientRequest.get('/api/search').pipe(
      HttpClientRequest.setUrlParams({ q: query }),
    )
    const response = yield* client.execute(request)
    const results = yield* S.decodeUnknownEffect(S.Array(Result))(
      yield* response.json,
    )
    return SucceededSearch({ requestId, results })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedSearch({ requestId, error: String(error) })),
    ),
    Effect.provide(FetchHttpClient.layer),
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
            results: () => ResultsLoading(),
            latestRequestId: () => requestId,
          }),
          [Search({ requestId, query })],
        ]
      },

      SucceededSearch: ({ requestId, results }) => {
        if (requestId !== model.latestRequestId) {
          return [model, []]
        }
        return [evo(model, { results: () => ResultsOk({ results }) }), []]
      },

      FailedSearch: ({ requestId, error }) => {
        if (requestId !== model.latestRequestId) {
          return [model, []]
        }
        return [evo(model, { results: () => ResultsFailure({ error }) }), []]
      },
    }),
  )

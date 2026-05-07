import { Effect, Match as M, Schema as S } from 'effect'
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from 'effect/unstable/http'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const ClickedFetchCount = m('ClickedFetchCount')
const SucceededFetchCount = m('SucceededFetchCount', {
  count: S.Number,
})
const FailedFetchCount = m('FailedFetchCount', {
  error: S.String,
})

const CountResponse = S.Struct({ count: S.Number })

const FetchCount = Command.define(
  'FetchCount',
  SucceededFetchCount,
  FailedFetchCount,
)(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.execute(HttpClientRequest.get('/api/count'))

    if (response.status !== 200) {
      return yield* Effect.fail('API request failed')
    }

    const { count } = yield* S.decodeUnknownEffect(CountResponse)(
      yield* response.json,
    )
    return SucceededFetchCount({ count })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedFetchCount({ error: String(error) })),
    ),
    Effect.provide(FetchHttpClient.layer),
  ),
)

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedFetchCount: () => [model, [FetchCount()]],
      SucceededFetchCount: ({ count }) => [{ count }, []],
      FailedFetchCount: () => [model, []],
    }),
  )

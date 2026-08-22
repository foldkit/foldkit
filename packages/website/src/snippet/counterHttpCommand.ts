import { Effect, Schema as S } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { Command, Http, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedFetchCount: {},
  SucceededFetchCount: { count: S.Number },
  FailedFetchCount: { error: S.String },
})

const CountResponse = S.Struct({ count: S.Number })

const FetchCount = Command.define('FetchCount', {
  messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  execute: Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.execute(HttpClientRequest.get('/api/count'))

    if (response.status !== 200) {
      return yield* Effect.fail('API request failed')
    }

    const { count } = yield* S.decodeUnknownEffect(CountResponse)(
      yield* response.json,
    )
    return Message.SucceededFetchCount({ count })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(Message.FailedFetchCount({ error: String(error) })),
    ),
    Effect.provide(Http.layer),
  ),
})

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedFetchCount: () => ({ model, commands: [FetchCount()] }),
    SucceededFetchCount: ({ count }) => ({
      model: evo(model, { count: () => count }),
    }),
    FailedFetchCount: () => ({ model }),
  })

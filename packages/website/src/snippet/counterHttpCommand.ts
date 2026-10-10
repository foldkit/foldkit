import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import type { Model } from './main'

export const Message = defineMessageUnion({
  ClickedFetchCount: {},
  SucceededFetchCount: { count: Schema.Int },
  FailedFetchCount: { error: Schema.String },
})
export type Message = typeof Message.Type

const CountResponse = Schema.Struct({ count: Schema.Int })

export const FetchCount = Command.define(
  'FetchCount',
  {
    messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  },
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return () => fetchCount(client)
  }),
)

export const fetchCount = (client: HttpClient.HttpClient) =>
  Effect.gen(function* () {
    const response = yield* client.execute(HttpClientRequest.get('/api/count'))
    const successfulResponse =
      yield* HttpClientResponse.filterStatusOk(response)

    const { count } = yield* Schema.decodeUnknownEffect(CountResponse)(
      yield* successfulResponse.json,
    )
    return Message.SucceededFetchCount({ count })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        Message.FailedFetchCount({ error: globalThis.String(error) }),
      ),
    ),
  )

export const FetchCountLayer = FetchCount.layer

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedFetchCount: () => ({ model, commands: [FetchCount()] }),
    SucceededFetchCount: ({ count }) => ({
      model: modifyFields(model, { count: () => count }),
    }),
    FailedFetchCount: () => ({ model }),
  }),
)

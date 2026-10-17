import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ count: Schema.Int })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedFetchCount: {},
  SucceededFetchCount: { count: Schema.Int },
  FailedFetchCount: { error: Schema.String },
})
export type Message = typeof Message.Type

export const Application = defineApplication({ Model, Message })

export const ApplicationComposition = Application.makeComposition()

const CountResponse = Schema.Struct({ count: Schema.Int })

export const FetchCount = Application.command('FetchCount', {
  messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  handler: function* () {
    const client = yield* HttpClient.HttpClient

    return () => fetchCount(client)
  },
})

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

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedFetchCount: () => ({ model, commands: [FetchCount()] }),
    SucceededFetchCount: ({ count }) => ({
      model: modifyFields(model, { count: () => count }),
    }),
    FailedFetchCount: () => ({ model }),
  }),
)

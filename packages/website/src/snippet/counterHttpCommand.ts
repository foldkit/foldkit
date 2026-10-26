import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Int })

export const Message = defineMessageUnion({
  ClickedFetchCount: {},
  SucceededFetchCount: { count: Schema.Int },
  FailedFetchCount: { error: Schema.String },
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep, makeCommandsStep, makeNoopStep } = ApplicationDefinition

export const ApplicationComposition = ApplicationDefinition.makeComposition()

const CountResponse = Schema.Struct({ count: Schema.Int })

export const FetchCount = ApplicationDefinition.makeCommand('FetchCount', {
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

export const update = ApplicationComposition.makeUpdate({
  ClickedFetchCount: makeCommandsStep(() => [FetchCount()]),
  SucceededFetchCount: makeFieldsStep.fromMessage(({ count }) => ({
    count: () => count,
  })),
  FailedFetchCount: makeNoopStep(),
})

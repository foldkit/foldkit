import { Effect, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedFetchCount: {},
  SucceededFetchCount: { count: Schema.Int },
  FailedFetchCount: { error: Schema.String },
})

export const FetchCount = Command.define('FetchCount', {
  messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ count: Schema.Int }),
  Message,
  Command: [FetchCount],
}) {}

const CountResponse = Schema.Struct({ count: Schema.Int })

export const fetchCount = (client: HttpClient.HttpClient) =>
  Effect.gen(function* () {
    const response = yield* client.execute(HttpClientRequest.get('/api/count'))
    const successfulResponse =
      yield* HttpClientResponse.filterStatusOk(response)

    const { count } = yield* Schema.decodeUnknownEffect(CountResponse)(
      yield* successfulResponse.json,
    )
    return Application.Message.SucceededFetchCount({ count })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        Application.Message.FailedFetchCount({
          error: globalThis.String(error),
        }),
      ),
    ),
  )

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const client = yield* HttpClient.HttpClient

    return {
      model: { count: 0 },

      update: {
        ClickedFetchCount: model => ({ model, commands: [FetchCount()] }),
        SucceededFetchCount: (model, { count }) => ({
          model: modifyFields(model, { count: () => count }),
        }),
        FailedFetchCount: model => ({ model }),
      },

      commands: {
        FetchCount: () => fetchCount(client),
      },
    }
  }),
)

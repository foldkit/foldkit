import { Context, Effect, Layer, Schema } from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse } from 'effect/http'
import { Http } from 'foldkit'

export const Session = Schema.Struct({ id: Schema.String })
export type Session = typeof Session.Type
type ApiClient = Readonly<{
  restoreSession: Effect.Effect<Session, unknown>
}>

export class ApiClientService extends Context.Service<
  ApiClientService,
  ApiClient
>()('ApiClientService') {}

const ApiClientLayer = Layer.effect(
  ApiClientService,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return {
      restoreSession: Effect.gen(function* () {
        const response = yield* client.execute(
          HttpClientRequest.get('/api/session'),
        )
        yield* HttpClientResponse.filterStatusOk(response)
        return yield* Schema.decodeUnknownEffect(Session)(yield* response.json)
      }),
    }
  }),
)

export const ApplicationLayer = Layer.provideMerge(ApiClientLayer, Http.layer)

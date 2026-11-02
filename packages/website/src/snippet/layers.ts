import { Context, Effect, Layer, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Http } from 'foldkit'

export const User = Schema.Struct({ id: Schema.String, name: Schema.String })
export type User = typeof User.Type

export class ApiClient extends Context.Service<
  ApiClient,
  Readonly<{
    getUser: (userId: string) => Effect.Effect<User, Error>
  }>
>()('ApiClient') {}

const ApiLayer = Layer.effect(
  ApiClient,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    return {
      getUser: userId =>
        Effect.gen(function* () {
          const request = HttpClientRequest.get(`/api/users/${userId}`)
          const response = yield* httpClient.execute(request)
          return yield* Schema.decodeUnknownEffect(User)(yield* response.json)
        }).pipe(Effect.mapError(cause => new Error(String(cause)))),
    }
  }),
)

export const ApplicationLayer = ApiLayer.pipe(Layer.provide(Http.layer))

export const ApplicationTestLayer = Layer.succeed(ApiClient, {
  getUser: userId =>
    Effect.succeed(User.make({ id: userId, name: 'Test User' })),
})

import { Context, Effect, Layer, Schema } from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import { Command, Http } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const User = Schema.Struct({ id: Schema.String, name: Schema.String })
type User = typeof User.Type

const Message = defineMessageUnion({
  SucceededLoadUser: { user: User },
  FailedLoadUser: { error: Schema.String },
})

type ApiClient = Readonly<{
  getUser: (userId: string) => Effect.Effect<User, unknown>
}>

class ApiClientService extends Context.Service<ApiClientService, ApiClient>()(
  'ApiClientService',
) {}

const LoadUser = Command.define('LoadUser', {
  args: { userId: Schema.String },
  messages: [Message.SucceededLoadUser, Message.FailedLoadUser],
})

const LoadUserLayer = LoadUser.toLayer(
  Effect.gen(function* () {
    const apiClient = yield* ApiClientService
    return ({ userId }) =>
      apiClient.getUser(userId).pipe(
        Effect.map(user => Message.SucceededLoadUser({ user })),
        Effect.catch(() =>
          Effect.succeed(Message.FailedLoadUser({ error: 'Request failed' })),
        ),
      )
  }),
)

const ApiLayer = Layer.effect(
  ApiClientService,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    return {
      getUser: userId =>
        Effect.gen(function* () {
          const request = HttpClientRequest.get(`/api/users/${userId}`)
          const response = yield* httpClient.execute(request)
          return yield* Schema.decodeUnknownEffect(User)(yield* response.json)
        }),
    }
  }),
)

const ApiTestLayer = Layer.succeed(ApiClientService, {
  getUser: userId =>
    Effect.succeed(User.make({ id: userId, name: 'Test User' })),
})

export const HandlersLayer = LoadUserLayer
export const layer = Layer.provideMerge(
  Layer.provideMerge(HandlersLayer, ApiLayer),
  Http.layer,
)
export const TestLayer = Layer.provideMerge(HandlersLayer, ApiTestLayer)

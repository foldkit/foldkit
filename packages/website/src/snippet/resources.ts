import { Context, Effect, Layer, Schema } from 'effect'
import { Command, Runtime } from 'foldkit'

class ApiClientService extends Context.Service<ApiClientService, ApiClient>()(
  'ApiClientService',
) {
  static readonly Default = Layer.effect(this, makeApiClient)
}

const LoadUser = Command.define('LoadUser', {
  args: { userId: Schema.String },
  messages: [CompletedLoadUser],
  execute: ({ userId }) =>
    Effect.gen(function* () {
      const apiClient = yield* ApiClientService
      const user = yield* apiClient.getUser(userId)
      return CompletedLoadUser({ user })
    }),
})

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  resources: ApiClientService.Default,
})

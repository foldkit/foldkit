import { Context, Effect, Layer, Schema } from 'effect'
import { Application, Command, Runtime } from 'foldkit'

import { Message } from './message'

class ApiClientService extends Context.Service<ApiClientService, ApiClient>()(
  'ApiClientService',
) {
  static readonly Default = Layer.effect(this, makeApiClient)
}

const LoadUser = Command.define('LoadUser', {
  args: { userId: Schema.String },
  messages: [Message.CompletedLoadUser],
})

const LoadUserLive = LoadUser.toLayer(({ userId }) =>
  Effect.gen(function* () {
    const apiClient = yield* ApiClientService
    const user = yield* apiClient.getUser(userId)
    return Message.CompletedLoadUser({ user })
  }),
)

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

const Live = Layer.provide(LoadUserLive, ApiClientService.Default)
Runtime.run(Application.provide(application, Live))

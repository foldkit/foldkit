import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Application, Runtime } from 'foldkit'

class ApiClientService extends Context.Service<ApiClientService, ApiClient>()(
  'ApiClientService',
) {}

const ApiClientLayer = Layer.effect(ApiClientService, makeApiClient)

const Flags = Schema.Struct({
  maybeSession: Schema.Option(Session),
})
type Flags = typeof Flags.Type

const flags: Effect.Effect<Flags, never, ApiClientService> = Effect.gen(
  function* () {
    const apiClient = yield* ApiClientService
    const session = yield* apiClient.restoreSession
    return Flags.make({ maybeSession: Option.some(session) })
  },
).pipe(
  Effect.catch(() =>
    Effect.succeed(Flags.make({ maybeSession: Option.none() })),
  ),
)

const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

Runtime.run(Application.provide(application, ApiClientLayer), {
  flags,
})

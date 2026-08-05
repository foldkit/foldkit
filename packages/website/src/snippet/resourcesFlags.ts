import { Context, Effect, Layer, Option, Schema as S } from 'effect'
import { Runtime } from 'foldkit'

class ApiClientService extends Context.Service<ApiClientService, ApiClient>()(
  'ApiClientService',
) {
  static readonly Default = Layer.effect(this, makeApiClient)
}

const Flags = S.Struct({
  maybeSession: S.Option(Session),
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

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  container: document.getElementById('root'),
  resources: ApiClientService.Default,
})

Runtime.run(application, { flags })

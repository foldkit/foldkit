import { Effect, Option, Schema as S } from 'effect'
import { ManagedResource } from 'foldkit'

const Socket = ManagedResource.tag<WebSocket>()('Socket')

// ❌ Bad
// A stateful browser handle created loosely leaks and lives outside the Model.
const badConnect = (url: string) => new WebSocket(url)

// ✅ Good
// Scope the handle to a ManagedResource so it acquires and releases with the
// Model condition that needs it.
const managedResources = ManagedResource.make<Model, Message>()(entry => ({
  socket: entry(S.Option(S.Struct({ url: S.String })), {
    resource: Socket,
    modelToMaybeRequirements: model =>
      Option.map(model.maybeConnection, ({ url }) => ({ url })),
    acquire: ({ url }) => Effect.sync(() => new WebSocket(url)),
    release: socket => Effect.sync(() => socket.close()),
  }),
}))

import { Effect, Schema } from 'effect'
import { Command, ManagedResource } from 'foldkit'
import { importedHandler } from 'external-handlers'

const readClock = () => Effect.succeed(Date.now())
const readClockAlias = readClock
const readClockBuild = Effect.gen(function* () {
  return readClockAlias
})

export const ReadNamedClock = Command.define('ReadNamedClock', {
  messages: [CompletedReadNamedClock],
})

export const ReadNamedClockLive = ReadNamedClock.toLayer(readClockBuild)

const readGeneratedClock = () => Effect.succeed(performance.now())

export const ReadGeneratedClock = Command.define('ReadGeneratedClock', {
  messages: [CompletedReadGeneratedClock],
})

export const ReadGeneratedClockLive = ReadGeneratedClock.toLayer(
  Effect.gen(function* () {
    yield* Effect.void
    const readGeneratedClockAlias = readGeneratedClock
    return readGeneratedClockAlias
  }),
)

function readDeclaredClock() {
  return Effect.succeed(Date.now())
}

export const ReadDeclaredClock = Command.define('ReadDeclaredClock', {
  messages: [CompletedReadDeclaredClock],
})

export const ReadDeclaredClockLive = ReadDeclaredClock.toLayer(
  Effect.gen(function* () {
    return readDeclaredClock
  }),
)

const readClockInsideEffect = () => Effect.succeed(Math.random())

export const ReadClockInsideEffect = Command.define('ReadClockInsideEffect', {
  messages: [CompletedReadClockInsideEffect],
})

export const ReadClockInsideEffectLive = ReadClockInsideEffect.toLayer(
  Effect.gen(function* () {
    return readClockInsideEffect
  }),
)

export const deferredExtraRead = Effect.sync(() => readClockInsideEffect())

const acquireConnection = () => Effect.succeed(crypto.randomUUID())
const releaseConnection = () => Effect.sync(() => crypto.getRandomValues(bytes))
const connectionLifecycle = {
  acquire: acquireConnection,
  release: releaseConnection,
}
const connectionLifecycleAlias = connectionLifecycle

export const managedResources = ManagedResource.make<typeof Model.Type, Message>()(
  entry => ({
    connection: entry(
      'NamedConnection',
      Schema.Struct({}),
      {
        resource: Resource,
        modelToMaybeRequirements: () => SomeRequirements,
        onAcquired: () => AcquiredConnection(),
        onAcquireError: () => FailedAcquireConnection(),
        onReleased: () => ReleasedConnection(),
      handler: function* () { return connectionLifecycleAlias },
      },
    ),
    generatedConnection: entry(
      'GeneratedNamedConnection',
      Schema.Struct({}),
      {
        resource: Resource,
        modelToMaybeRequirements: () => SomeRequirements,
        onAcquired: () => AcquiredConnection(),
        onAcquireError: () => FailedAcquireConnection(),
        onReleased: () => ReleasedConnection(),
      handler: function* () {
        yield* Effect.void
        return connectionLifecycleAlias
      },
      },
    ),
  }),
)

{
  const readClock = () => Effect.succeed(Math.random())

  Command.define('ReadShadowedClock', { messages: [CompletedReadShadowedClock] }).toLayer(
    Effect.gen(function* () {
      return readClock
    }),
  )
}

const cycleA = cycleB
const cycleB = cycleA

Command.define('UnresolvedCycle', { messages: [CompletedUnresolvedCycle] }).toLayer(
  Effect.gen(function* () {
    return cycleA
  }),
)

Command.define('ImportedHandler', { messages: [CompletedImportedHandler] }).toLayer(
  Effect.gen(function* () {
    return importedHandler
  }),
)

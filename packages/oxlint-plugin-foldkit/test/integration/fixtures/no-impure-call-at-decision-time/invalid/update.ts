import { Effect, Option, Schema } from 'effect'
import { Command, ManagedResource, Subscription } from 'foldkit'

const Save = Command.define('Save', {
  args: { id: Schema.String, createdAt: Schema.Number },
  messages: [CompletedSave],
})

export const EagerSaveLayer = Save.toLayer(Effect.succeed(Date.now()))

const makeId = () => Math.random().toString()
const FakeEffect = {
  sync: <Value>(evaluate: () => Value): Value => evaluate(),
}

export const update = (model: Model) => ({
  model,
  commands: [
    Save({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }),
  ],
})

export const initializedAt = new Date()
export const initializedDateString = Date()
export const initializedPerformance = globalThis.performance.now()
export const initializedComputedTime = globalThis['Date']['now']()
export const initializedBytes = window.crypto.getRandomValues(
  new Uint8Array(8),
)
export const hiddenId = makeId()
export const fakeEffectValue = FakeEffect.sync(() => Date.now())
export const eagerMappedEffect = Effect.mapEager(
  Effect.succeed(1),
  () => Date.now(),
)
export const eagerMatchedEffect = Effect.matchEager(Effect.succeed(1), {
  onFailure: () => 0,
  onSuccess: () => Math.random(),
})
export const unsafeEffectFunction = Effect.fn(
  function* () {
    yield* Effect.void
  },
  effect => Effect.as(effect, Date.now()),
)
export const cancel = Effect.runCallback(Effect.succeed(1), {
  onExit: () => Math.random(),
})
export const missing = Effect.fromOption(Option.none(), () => Date.now())
export const functionValue = Effect.succeed(() => Math.random())

export const subscriptions = Subscription.make<Model, Message>()(entry => {
  const initializedSubscriptionAt = Date.now()

  return {
    clock: entry(
      'Clock',
      { initializedSubscriptionAt: Schema.Number },
      {
        messages: [],
        modelToDependencies: () => ({
          initializedSubscriptionAt: Date.now(),
        }),
      },
    ),
  }
})

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    connection: entry(
      'Connection',
      Schema.Struct({}),
      {
        resource: Resource,
        modelToMaybeRequirements: () =>
          Option.some({ startedAt: Date.now() }),
        onAcquired: () => AcquiredConnection(),
        onAcquireError: () => FailedAcquireConnection(),
        onReleased: () => ReleasedConnection(),
      },
    ),
  }),
)

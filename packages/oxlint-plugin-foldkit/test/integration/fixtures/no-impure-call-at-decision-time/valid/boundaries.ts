import { Effect, Schema, Stream } from 'effect'
import {
  Command,
  ManagedResource,
  Mount,
  Subscription,
} from 'foldkit'

export const ReadClock = Command.define('ReadClock', {
  messages: [CompletedReadClock],
})

export const ReadClockLayer = ReadClock.toLayer(
  Effect.succeed(() =>
    Effect.succeed(CompletedReadClock({ timestamp: Date.now() })),
  ),
)

export const ReadClockWithEffect = Command.define('ReadClockWithEffect', {
  messages: [CompletedReadClockWithEffect],
})

export const ReadClockWithEffectLayer = ReadClockWithEffect.toLayer(
  Effect.succeed(() =>
    Effect.sync(() =>
      CompletedReadClockWithEffect({ timestamp: performance.now() }),
    ),
  ),
)

export const WrappedReadClock = Command.define(
  'WrappedReadClock',
  {
    messages: [CompletedWrappedReadClock],
  } satisfies CommandDefinition,
)

export const WrappedReadClockLayer = WrappedReadClock.toLayer(
  Effect.succeed(() =>
    Effect.succeed(CompletedWrappedReadClock({ timestamp: Date.now() })),
  ),
)

export const MeasureElement = Mount.define('MeasureElement', {
  messages: [CompletedMeasureElement],
})

export const MeasureElementLayer = MeasureElement.toLayer(
  Effect.succeed(({ element }) =>
    Effect.succeed(
      CompletedMeasureElement({ element, timestamp: Date.now() }),
    ),
  ),
)

export const effect = Effect.gen(function* () {
  return crypto.randomUUID()
})

export const wrappedEffect = Effect.sync(
  (() => Date.now()) satisfies () => number,
)

export const readClock = Effect.fn('readClock')(function* () {
  return Date.now()
})

export const mappedEffect = Effect.succeed(1).pipe(
  Effect.map(() => Math.random()),
)

export const matchedEffect = Effect.match(Effect.succeed(1), {
  onFailure: () => Date.now(),
  onSuccess: () => Date.now(),
})

export const matchedWrappedEffect = Effect.match(
  Effect.succeed(1),
  {
    onFailure: () => Date.now(),
    onSuccess: () => Date.now(),
  } satisfies MatchHandlers,
)

export const matchedCause = Effect.matchCause(Effect.succeed(1), {
  onFailure: () => performance.now(),
  onSuccess: () => performance.now(),
})

export const matchedEffectfully = Effect.matchEffect(Effect.succeed(1), {
  onFailure: () => Effect.succeed(crypto.randomUUID()),
  onSuccess: () => Effect.succeed(crypto.randomUUID()),
})

export const mappedBoth = Effect.mapBoth(Effect.succeed(1), {
  onFailure: () => Math.random(),
  onSuccess: () => Math.random(),
})

export const triedEffect = Effect.try({
  try: () => Date.now(),
  catch: () => new Date(),
})

export const stream = Stream.make(1).pipe(Stream.map(() => performance.now()))
export const mappedStream = Stream.mapBoth(Stream.make(1), {
  onError: () => Date.now(),
  onElement: () => Date.now(),
})

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  clock: entry(
    'Clock',
    {},
    {
      messages: [Schema.Number],
      modelToDependencies: () => ({}),
    },
  ),
}))

export const ClockLayer = subscriptions.clock.toLayer(
  Effect.succeed(() => Stream.make(Date.now())),
)

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    connection: entry(
      'Connection',
      Schema.Struct({}),
      {
        resource: Resource,
        modelToMaybeRequirements: () => SomeRequirements,
        onAcquired: () => AcquiredConnection(),
        onAcquireError: () => FailedAcquireConnection(),
        onReleased: () => ReleasedConnection(),
      },
    ),
  }),
)

export const ConnectionLayer = managedResources.connection.toLayer(
  Effect.succeed({
    acquire: () => Effect.succeed(crypto.randomUUID()),
    release: () => Effect.sync(() => crypto.getRandomValues(bytes)),
  }),
)

export const fromKnownTime = new Date(timestamp)

export const ReadAttachedClock = Command.define('ReadAttachedClock', {
  messages: [CompletedReadClock],
handler: function* () { return () => Effect.succeed(CompletedReadClock({ timestamp: Date.now() })) },
})

export const attachedSubscriptions = Subscription.make<Model, Message>()(entry => ({
  clock: entry('AttachedClock', { messages: [Schema.Number], handler: function* () { return () => Stream.make(Date.now()) }},
  ),
}))

export const attachedResources = ManagedResource.make<Model, Message>()(entry => ({
  connection: entry('AttachedConnection', Schema.Struct({}), {
    resource: Resource,
    modelToMaybeRequirements: () => SomeRequirements,
    onAcquired: () => AcquiredConnection(),
    onAcquireError: () => FailedAcquireConnection(),
    onReleased: () => ReleasedConnection(),
  handler: function* () { return {
    acquire: () => Effect.succeed(crypto.randomUUID()),
    release: () => Effect.sync(() => crypto.getRandomValues(bytes)),
  } },
  }),
}))

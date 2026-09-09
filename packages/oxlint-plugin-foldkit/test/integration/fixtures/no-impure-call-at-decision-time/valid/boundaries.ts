import { Effect, Schema, Stream } from 'effect'
import {
  Command,
  ManagedResource,
  Mount,
  Subscription,
} from 'foldkit'

export const ReadClock = Command.define('ReadClock', {
  messages: [CompletedReadClock],
  execute: () =>
    Effect.succeed(CompletedReadClock({ timestamp: Date.now() })),
})

export const ReadClockWithEffect = Command.define('ReadClockWithEffect', {
  messages: [CompletedReadClockWithEffect],
  execute: Effect.sync(() => performance.now()),
})

export const WrappedReadClock = Command.define(
  'WrappedReadClock',
  {
    messages: [CompletedWrappedReadClock],
    execute: () =>
      Effect.succeed(CompletedWrappedReadClock({ timestamp: Date.now() })),
  } satisfies CommandDefinition,
)

export const MeasureElement = Mount.define('MeasureElement', {
  messages: [CompletedMeasureElement],
  execute: () =>
    Effect.succeed(CompletedMeasureElement({ timestamp: Date.now() })),
})

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
  onFailure: () => Date.now(),
  onSuccess: () => Date.now(),
})

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  clock: entry(
    {},
    {
      modelToDependencies: () => ({}),
      dependenciesToStream: () => Stream.make(Date.now()),
    },
  ),
}))

export const managedResources = ManagedResource.make<Model, Message>()(
  entry => ({
    connection: entry(Resource, Schema.Struct({}), {
      modelToMaybeRequirements: () => SomeRequirements,
      acquire: () => Effect.succeed(crypto.randomUUID()),
      release: () => Effect.sync(() => crypto.getRandomValues(bytes)),
    }),
  }),
)

export const fromKnownTime = new Date(timestamp)

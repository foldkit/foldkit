import { Effect, Stream } from 'effect'

const effect = Effect.succeed(1)
const numberStream = Stream.make(1)
const byteStream = Stream.make(new Uint8Array(1))

export const repeated = Effect.repeat(effect, {
  while: () => Date.now() > 0,
  until: () => Math.random() > 0.5,
})

export const retried = Effect.retry(effect, {
  while: () => Date.now() > 0,
  until: () => Math.random() > 0.5,
})

export const filteredOrElse = Effect.filterOrElse(
  effect,
  () => Date.now() > 0,
  () => Effect.succeed(Math.random()),
)

export const filterMappedOrElse = Effect.filterMapOrElse(
  effect,
  value => {
    Date.now()
    return value
  },
  () => Effect.succeed(Math.random()),
)

export const filteredOrFailed = Effect.filterOrFail(effect, () => {
  Date.now()
  return true
})

export const filterMappedOrFailed = Effect.filterMapOrFail(effect, value => {
  Date.now()
  return value
})

export const caughtReason = Effect.catchReason(
  effect,
  'Error',
  'Reason',
  () => Effect.succeed(Date.now()),
  () => Effect.succeed(Math.random()),
)

export const caughtReasons = Effect.catchReasons(
  effect,
  'Error',
  { Reason: () => Effect.succeed(Date.now()) },
  () => Effect.succeed(Math.random()),
)

export const acquired = Effect.acquireRelease(
  effect,
  () => Effect.succeed(Date.now()),
  { interruptible: true },
)

export const finalized = Effect.onExitPrimitive(
  effect,
  () => Effect.succeed(Date.now()),
  true,
)

export const plannedEffect = Effect.withExecutionPlan(effect, plan, {
  onEvent: () => Effect.succeed(Date.now()),
})

export const raced = Effect.race(effect, effect, {
  onWinner: () => Date.now(),
})

export const racedFirst = Effect.raceFirst(effect, effect, {
  onWinner: () => Date.now(),
})

export const racedAll = Effect.raceAll([effect], {
  onWinner: () => Date.now(),
})

export const racedAllFirst = Effect.raceAllFirst([effect], {
  onWinner: () => Date.now(),
})

export const transformedPull = Stream.transformPull(numberStream, pull => {
  Date.now()
  return Effect.succeed(pull)
})

export const transformedPullBracket = Stream.transformPullBracket(
  numberStream,
  pull => {
    Math.random()
    return Effect.succeed(pull)
  },
)

export const partitionedQueue = Stream.partitionQueue(numberStream, value => {
  Date.now()
  return value > 0
})

export const plannedStream = Stream.withExecutionPlan(numberStream, plan, {
  onEvent: () => Effect.succeed(Date.now()),
})

export const limitedBytes = Stream.limitBytes(byteStream, 1, () => {
  Date.now()
  return Stream.empty
})

export const split = Stream.split(numberStream, value => {
  Math.random()
  return value > 0
})

export const zippedArrays = Stream.zipWithArray(
  numberStream,
  numberStream,
  (left, right) => {
    Date.now()
    return [left, [], right]
  },
)

export const scanned = Stream.scan(numberStream, 0, state => {
  Date.now()
  return state + 1
})

export const caughtStream = Stream.catch(numberStream, () => {
  Date.now()
  return Stream.empty
})

export const extendedStreamRecord = Stream.let(
  Stream.succeed({ value: 1 }),
  'timestamp',
  () => Date.now(),
)

export const caughtStreamReason = Stream.catchReason(
  numberStream,
  'Error',
  'Reason',
  () => Stream.succeed(Date.now()),
  () => Stream.succeed(Math.random()),
)

export const caughtStreamReasons = Stream.catchReasons(
  numberStream,
  'Error',
  { Reason: () => Stream.succeed(Date.now()) },
  () => Stream.succeed(Math.random()),
)

export const combined = Stream.combine(
  numberStream,
  numberStream,
  () => Date.now(),
  state => Effect.succeed([Math.random(), state]),
)

export const combinedArrays = Stream.combineArray(
  numberStream,
  numberStream,
  () => Date.now(),
  state => Effect.succeed([[Math.random()], state]),
)

export const accumulated = Stream.mapAccum(
  numberStream,
  () => Date.now(),
  state => [state, [Math.random()]],
  { onHalt: () => [Date.now()] },
)

export const accumulatedArrays = Stream.mapAccumArray(
  numberStream,
  () => Date.now(),
  state => [state, [Math.random()]],
  { onHalt: () => [Date.now()] },
)

export const accumulatedEffectfully = Stream.mapAccumEffect(
  numberStream,
  () => Date.now(),
  state => Effect.succeed([state, [Math.random()]]),
  { onHalt: () => [Date.now()] },
)

export const accumulatedArraysEffectfully = Stream.mapAccumArrayEffect(
  numberStream,
  () => Date.now(),
  state => Effect.succeed([state, [Math.random()]]),
  { onHalt: () => [Date.now()] },
)

export const grouped = Stream.groupBy(numberStream, () => {
  Date.now()
  return Effect.succeed(['key', 1])
}, {})

export const groupedByKey = Stream.groupByKey(
  value => {
    Date.now()
    return value
  },
  {},
)(numberStream)

export const bound = Stream.bind(
  Stream.succeed({ value: 1 }),
  'next',
  () => Stream.succeed(Date.now()),
  {},
)

export const boundEffectfully = Stream.bindEffect(
  'next',
  () => Effect.succeed(Date.now()),
  {},
)(Stream.succeed({ value: 1 }))

export const takenUntil = Stream.takeUntil(
  numberStream,
  () => Date.now() > 0,
  { excludeLast: true },
)

export const takenUntilEffectfully = Stream.takeUntilEffect(
  () => Effect.succeed(Date.now() > 0),
  { excludeLast: true },
)(numberStream)

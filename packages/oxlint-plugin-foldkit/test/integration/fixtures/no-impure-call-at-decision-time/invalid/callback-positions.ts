import { Effect, Stream } from 'effect'

const effect = Effect.succeed(1)

export const generatedWithFunctionData = Effect.gen(
  { self: () => Math.random() },
  function* () {
    return 1
  },
)

export const repeatedWithScheduleBuilder = Effect.repeat(effect, () => {
  Date.now()
  return schedule
})

export const retriedWithScheduleBuilder = Effect.retry(effect, () => {
  Math.random()
  return schedule
})

export const iteratedFromFunctionData = Stream.iterate(
  () => Math.random(),
  current => current,
)

export const scannedFromFunctionData = Stream.scan(
  Stream.make(1),
  { read: () => Date.now() },
  state => state,
)

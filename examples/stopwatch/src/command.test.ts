import { Effect, Layer } from 'effect'
import { TestClock } from 'effect/testing'
import { expect, test } from 'vitest'

import {
  DetermineStartTime,
  DetermineStartTimeLayer,
  DetermineTickTime,
  DetermineTickTimeLayer,
  Message,
} from './main'

test('the real time handlers read the test Clock on each execution', async () => {
  const HandlersLayer = Layer.mergeAll(
    DetermineStartTimeLayer,
    DetermineTickTimeLayer,
  ).pipe(Layer.provideMerge(TestClock.layer()))

  const messages = await Effect.runPromise(
    Effect.gen(function* () {
      yield* TestClock.setTime(1000)
      const start = yield* DetermineStartTime({ elapsedMs: 250 }).effect
      const firstTick = yield* DetermineTickTime({ startTime: 750 }).effect

      yield* TestClock.adjust('500 millis')
      const secondTick = yield* DetermineTickTime({ startTime: 750 }).effect

      return { start, firstTick, secondTick }
    }).pipe(Effect.provide(HandlersLayer)),
  )

  expect(messages).toEqual({
    start: Message.CompletedDetermineStartTime({ startTime: 750 }),
    firstTick: Message.CompletedDetermineTickTime({ elapsedMs: 250 }),
    secondTick: Message.CompletedDetermineTickTime({ elapsedMs: 750 }),
  })
})

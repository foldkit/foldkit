import { Effect, TestClock, TestContext } from 'effect'
import { describe, expect, it } from 'vitest'

import { make } from './calendarDate.js'
import { today } from './today.js'

describe('today.local', () => {
  it('returns the calendar date at the current Clock time', () =>
    Effect.runPromise(
      Effect.gen(function* () {
        // Freeze time to 2026-04-13T12:00:00 UTC
        yield* TestClock.setTime(Date.UTC(2026, 3, 13, 12, 0, 0))
        const result = yield* today.local
        // fromDateLocal uses local TZ getters, so the result depends on the
        // test runner's TZ. We only verify the year and that the month/day
        // are in a plausible range near April 13.
        expect(result.year).toBe(2026)
        expect(result.month).toBeGreaterThanOrEqual(3)
        expect(result.month).toBeLessThanOrEqual(4)
      }).pipe(Effect.provide(TestContext.TestContext)),
    ))

  it('produces consistent results for the same frozen time', () =>
    Effect.runPromise(
      Effect.gen(function* () {
        yield* TestClock.setTime(Date.UTC(2026, 3, 13, 12, 0, 0))
        const first = yield* today.local
        const second = yield* today.local
        expect(first).toStrictEqual(second)
      }).pipe(Effect.provide(TestContext.TestContext)),
    ))
})

describe('today.inZone', () => {
  it('returns the calendar date in the specified timezone', () =>
    Effect.runPromise(
      Effect.gen(function* () {
        // 2026-04-13T12:00:00Z is April 13 in both UTC and New York
        yield* TestClock.setTime(Date.UTC(2026, 3, 13, 12, 0, 0))
        const utc = yield* today.inZone('UTC')
        expect(utc).toStrictEqual(make(2026, 4, 13))

        const nyc = yield* today.inZone('America/New_York')
        expect(nyc).toStrictEqual(make(2026, 4, 13))
      }).pipe(Effect.provide(TestContext.TestContext)),
    ))

  it('reflects timezone-dependent date transitions', () =>
    Effect.runPromise(
      Effect.gen(function* () {
        // 2026-04-13T01:00:00Z — UTC is April 13, but New York is still April 12
        yield* TestClock.setTime(Date.UTC(2026, 3, 13, 1, 0, 0))
        const utc = yield* today.inZone('UTC')
        expect(utc).toStrictEqual(make(2026, 4, 13))

        const nyc = yield* today.inZone('America/New_York')
        expect(nyc).toStrictEqual(make(2026, 4, 12))
      }).pipe(Effect.provide(TestContext.TestContext)),
    ))

  it('advances when the Clock advances across a day boundary', () =>
    Effect.runPromise(
      Effect.gen(function* () {
        yield* TestClock.setTime(Date.UTC(2026, 3, 13, 23, 0, 0))
        const before = yield* today.inZone('UTC')
        expect(before).toStrictEqual(make(2026, 4, 13))

        yield* TestClock.adjust('2 hours')
        const after = yield* today.inZone('UTC')
        expect(after).toStrictEqual(make(2026, 4, 14))
      }).pipe(Effect.provide(TestContext.TestContext)),
    ))
})

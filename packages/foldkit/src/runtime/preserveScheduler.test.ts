import { Duration, Effect, Ref } from 'effect'
import { TestClock } from 'effect/testing'
import { describe, expect, it } from 'vitest'

import {
  type PreserveSchedulerCallbacks,
  makePreserveScheduler,
} from './preserveScheduler.js'

const setupRecorder = <Model>() =>
  Effect.gen(function* () {
    const debounced = yield* Ref.make<ReadonlyArray<Model>>([])
    const flushed = yield* Ref.make<ReadonlyArray<Model>>([])
    const callbacks: PreserveSchedulerCallbacks<Model> = {
      onDebounce: model => Ref.update(debounced, models => [...models, model]),
      onFlush: model => Ref.update(flushed, models => [...models, model]),
    }
    return { callbacks, debounced, flushed }
  })

const runWithTestClock = <A, E>(effect: Effect.Effect<A, E, any>) =>
  Effect.runPromise(
    effect.pipe(Effect.scoped, Effect.provide(TestClock.layer())),
  )

describe('makePreserveScheduler', () => {
  it('does not run any callback synchronously on schedule', () =>
    runWithTestClock(
      Effect.gen(function* () {
        const { callbacks, debounced, flushed } = yield* setupRecorder<{
          id: number
        }>()
        const scheduler = yield* makePreserveScheduler(
          callbacks,
          Duration.millis(200),
        )

        yield* scheduler.schedule({ id: 1 })

        expect(yield* Ref.get(debounced)).toEqual([])
        expect(yield* Ref.get(flushed)).toEqual([])
      }),
    ))

  it('runs onDebounce with the latest model after the debounce delay', () =>
    runWithTestClock(
      Effect.gen(function* () {
        const { callbacks, debounced, flushed } = yield* setupRecorder<{
          id: number
        }>()
        const scheduler = yield* makePreserveScheduler(
          callbacks,
          Duration.millis(200),
        )

        yield* scheduler.schedule({ id: 1 })
        yield* TestClock.adjust(Duration.millis(200))

        expect(yield* Ref.get(debounced)).toEqual([{ id: 1 }])
        expect(yield* Ref.get(flushed)).toEqual([])
      }),
    ))

  it('coalesces a burst of schedules into a single onDebounce with the latest model', () =>
    runWithTestClock(
      Effect.gen(function* () {
        const { callbacks, debounced } = yield* setupRecorder<{ id: number }>()
        const scheduler = yield* makePreserveScheduler(
          callbacks,
          Duration.millis(200),
        )

        yield* scheduler.schedule({ id: 1 })
        yield* TestClock.adjust(Duration.millis(100))
        yield* scheduler.schedule({ id: 2 })
        yield* TestClock.adjust(Duration.millis(100))
        yield* scheduler.schedule({ id: 3 })
        yield* TestClock.adjust(Duration.millis(200))

        expect(yield* Ref.get(debounced)).toEqual([{ id: 3 }])
      }),
    ))

  it('flush runs onFlush with the latest model and cancels the pending timer', () =>
    runWithTestClock(
      Effect.gen(function* () {
        const { callbacks, debounced, flushed } = yield* setupRecorder<{
          id: number
        }>()
        const scheduler = yield* makePreserveScheduler(
          callbacks,
          Duration.millis(200),
        )

        yield* scheduler.schedule({ id: 1 })
        yield* scheduler.flush

        expect(yield* Ref.get(flushed)).toEqual([{ id: 1 }])
        expect(yield* Ref.get(debounced)).toEqual([])

        yield* TestClock.adjust(Duration.millis(200))
        expect(yield* Ref.get(debounced)).toEqual([])
        expect(yield* Ref.get(flushed)).toEqual([{ id: 1 }])
      }),
    ))

  it('flush is a no-op when nothing is pending', () =>
    runWithTestClock(
      Effect.gen(function* () {
        const { callbacks, debounced, flushed } = yield* setupRecorder<{
          id: number
        }>()
        const scheduler = yield* makePreserveScheduler(
          callbacks,
          Duration.millis(200),
        )

        yield* scheduler.flush

        expect(yield* Ref.get(debounced)).toEqual([])
        expect(yield* Ref.get(flushed)).toEqual([])
      }),
    ))

  it('flush after onDebounce already ran does not double-fire', () =>
    runWithTestClock(
      Effect.gen(function* () {
        const { callbacks, debounced, flushed } = yield* setupRecorder<{
          id: number
        }>()
        const scheduler = yield* makePreserveScheduler(
          callbacks,
          Duration.millis(200),
        )

        yield* scheduler.schedule({ id: 1 })
        yield* TestClock.adjust(Duration.millis(200))

        expect(yield* Ref.get(debounced)).toEqual([{ id: 1 }])

        yield* scheduler.flush
        expect(yield* Ref.get(debounced)).toEqual([{ id: 1 }])
        expect(yield* Ref.get(flushed)).toEqual([])
      }),
    ))

  it('cancel drops the pending model so neither callback fires', () =>
    runWithTestClock(
      Effect.gen(function* () {
        const { callbacks, debounced, flushed } = yield* setupRecorder<{
          id: number
        }>()
        const scheduler = yield* makePreserveScheduler(
          callbacks,
          Duration.millis(200),
        )

        yield* scheduler.schedule({ id: 1 })
        yield* scheduler.cancel
        yield* TestClock.adjust(Duration.millis(200))
        yield* scheduler.flush

        expect(yield* Ref.get(debounced)).toEqual([])
        expect(yield* Ref.get(flushed)).toEqual([])
      }),
    ))

  it('cancel followed by schedule starts a fresh debounce', () =>
    runWithTestClock(
      Effect.gen(function* () {
        const { callbacks, debounced } = yield* setupRecorder<{ id: number }>()
        const scheduler = yield* makePreserveScheduler(
          callbacks,
          Duration.millis(200),
        )

        yield* scheduler.schedule({ id: 1 })
        yield* scheduler.cancel

        yield* scheduler.schedule({ id: 2 })
        yield* TestClock.adjust(Duration.millis(200))

        expect(yield* Ref.get(debounced)).toEqual([{ id: 2 }])
      }),
    ))

  it('a second schedule after the timer fires starts a new debounce window', () =>
    runWithTestClock(
      Effect.gen(function* () {
        const { callbacks, debounced } = yield* setupRecorder<{ id: number }>()
        const scheduler = yield* makePreserveScheduler(
          callbacks,
          Duration.millis(200),
        )

        yield* scheduler.schedule({ id: 1 })
        yield* TestClock.adjust(Duration.millis(200))
        expect(yield* Ref.get(debounced)).toEqual([{ id: 1 }])

        yield* scheduler.schedule({ id: 2 })
        yield* TestClock.adjust(Duration.millis(200))
        expect(yield* Ref.get(debounced)).toEqual([{ id: 1 }, { id: 2 }])
      }),
    ))
})

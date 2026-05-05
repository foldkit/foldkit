import { type Duration, Effect, Fiber, Option, Ref, type Scope } from 'effect'

/**
 * Defers a `preserve(model)` call so that bursts of dispatches do not pay the
 * encoding cost on the hot path. `schedule` stashes the latest model and
 * (re)starts a debounce timer; only one `onDebounce` runs per quiet window.
 *
 * `flush` runs `onFlush` with the latest pending model synchronously: it
 * clears the pending slot atomically and invokes the callback, leaving any
 * in-flight timer fiber to wake up, observe an empty pending slot, and exit
 * as a no-op. Synchronous semantics let the runtime call this from
 * `vite:beforeFullReload` via `Effect.runSync`, with no race against Vite's
 * `location.reload()`. The two-callback split lets the flush path send
 * `isHmrReload: true` while debounced calls send `false`.
 *
 * `cancel` drops the pending model and interrupts the in-flight fiber.
 * Forked fibers are tied to the construction scope via `forkIn`, so scope
 * closure interrupts them too. `cancel` covers manual teardown.
 */
export type PreserveScheduler<Model> = Readonly<{
  schedule: (model: Model) => Effect.Effect<void>
  flush: Effect.Effect<void>
  cancel: Effect.Effect<void>
}>

export type PreserveSchedulerCallbacks<Model> = Readonly<{
  onDebounce: (model: Model) => Effect.Effect<void>
  onFlush: (model: Model) => Effect.Effect<void>
}>

export const makePreserveScheduler = <Model>(
  callbacks: PreserveSchedulerCallbacks<Model>,
  delay: Duration.Input,
): Effect.Effect<PreserveScheduler<Model>, never, Scope.Scope> =>
  Effect.gen(function* () {
    const scope = yield* Effect.scope
    const pendingRef = yield* Ref.make<Option.Option<Model>>(Option.none())
    const fiberRef = yield* Ref.make<Option.Option<Fiber.Fiber<void>>>(
      Option.none(),
    )

    const interruptPending = Effect.gen(function* () {
      const maybeFiber = yield* Ref.get(fiberRef)
      yield* Option.match(maybeFiber, {
        onNone: () => Effect.void,
        onSome: Fiber.interrupt,
      })
      yield* Ref.set(fiberRef, Option.none())
    })

    const runPending = (callback: (model: Model) => Effect.Effect<void>) =>
      Effect.gen(function* () {
        const maybePending = yield* Ref.getAndSet(pendingRef, Option.none())
        yield* Option.match(maybePending, {
          onNone: () => Effect.void,
          onSome: callback,
        })
      })

    const schedule = (model: Model): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* Ref.set(pendingRef, Option.some(model))
        yield* interruptPending
        const fiber = yield* Effect.forkIn(
          Effect.gen(function* () {
            yield* Effect.sleep(delay)
            yield* runPending(callbacks.onDebounce)
          }),
          scope,
        )
        yield* Ref.set(fiberRef, Option.some(fiber))
      })

    const flush = runPending(callbacks.onFlush)

    const cancel = Effect.gen(function* () {
      yield* interruptPending
      yield* Ref.set(pendingRef, Option.none())
    })

    return { schedule, flush, cancel }
  })

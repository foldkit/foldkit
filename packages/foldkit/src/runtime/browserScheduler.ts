import { Effect, Layer, Scheduler } from 'effect'

// NOTE: scheduling fix for browser performance. Effect needs to defer work
// onto a future tick of the event loop. The default browser scheduler picks
// `setTimeout(f, 0)`, but browsers clamp `setTimeout` to a minimum of 4ms.
// `queueMicrotask` runs on the very next tick (sub-millisecond). Dispatch no
// longer routes through the Effect scheduler, but Command and Subscription
// fibers still do; without this override every fiber yield (for example, an
// op-budget suspension, or a Stream step) would take an extra 4-16ms
// round-trip before
// its result Message lands.
const microtaskSetImmediate = (callback: () => void): (() => void) => {
  let cancelled = false
  queueMicrotask(() => {
    if (!cancelled) callback()
  })
  return () => {
    cancelled = true
  }
}

const browserScheduler = new Scheduler.MixedScheduler(
  'async',
  microtaskSetImmediate,
)

export const provideBrowserScheduler = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> =>
  Effect.provide(effect, Layer.succeed(Scheduler.Scheduler, browserScheduler))

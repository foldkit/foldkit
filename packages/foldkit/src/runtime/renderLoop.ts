import { Effect, Stream, SubscriptionRef } from 'effect'

export type RenderLoopConfig = Readonly<{
  /** SubscriptionRef holding the dirty bit. The loop subscribes to its changes
   *  Stream so it can suspend entirely when the bit stays false. */
  pendingRef: SubscriptionRef.SubscriptionRef<boolean>
  /** Effect that yields once the next animation frame fires. */
  awaitNextFrame: Effect.Effect<void>
  /** Effect that returns whether the runtime is paused (e.g. via DevTools
   *  time-travel). When true, the body skips render but still clears the bit. */
  isPaused: Effect.Effect<boolean>
  /** Effect that performs one render with the latest model. */
  render: Effect.Effect<void>
}>

/** Builds an idle-suspending render loop driven by a SubscriptionRef of
 *  "render is pending."
 *
 *  The loop subscribes to the ref's changes Stream and runs the body once per
 *  false-to-true transition. Stream.changes filters consecutive equals so a
 *  burst of `set(true)` calls inside one frame produces a single body run.
 *
 *  The body waits for the next animation frame, clears the dirty bit, then
 *  renders if not paused. The bit is cleared on every body run (including
 *  paused early-returns) so the next dispatch is always a real false-to-true
 *  transition. This makes the loop self-recovering even when paused state
 *  flips externally without a synchronous render. */
export const makeRenderLoop = ({
  pendingRef,
  awaitNextFrame,
  isPaused,
  render,
}: RenderLoopConfig): Effect.Effect<void> => {
  const tick = Effect.gen(function* () {
    yield* awaitNextFrame
    yield* SubscriptionRef.set(pendingRef, false)
    const paused = yield* isPaused
    if (paused) {
      return
    }
    yield* render
  })

  return SubscriptionRef.changes(pendingRef).pipe(
    Stream.changes,
    Stream.filter(isPending => isPending),
    Stream.runForEach(() => tick),
  )
}

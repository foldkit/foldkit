import { Duration, Effect } from 'effect'

/**
 * Waits for the given duration before completing.
 * Useful for debouncing, such as clearing a typeahead search query.
 *
 * @example
 * ```typescript
 * Task.delay('1 second').pipe(Effect.as(TimedOut()))
 * ```
 */
export const delay = (duration: Duration.Input): Effect.Effect<void> =>
  Effect.sleep(duration)

/**
 * Completes after the runtime's next render commits. The runtime batches
 * renders to `requestAnimationFrame`, so a Command, Subscription, or other
 * Effect that runs immediately after a dirtying Message would otherwise
 * query the DOM before the matching VDOM patch has applied. Yield this
 * before any DOM read or write whose target was just brought into existence
 * (or moved, or had its attributes changed) by the same Message.
 *
 * The Task DOM helpers (`focus`, `clickElement`, `scrollIntoView`, etc.)
 * already gate themselves with this internally; reach for `afterRender`
 * directly when building custom Commands or DOM-observing Subscriptions
 * that need the same guarantee.
 *
 * @example
 * ```typescript
 * Effect.gen(function* () {
 *   yield* Task.afterRender
 *   const element = document.getElementById(id)
 *   // element reflects the post-Message DOM
 * })
 * ```
 */
export const afterRender: Effect.Effect<void> = Effect.callback<void>(
  resume => {
    const handle = requestAnimationFrame(() => resume(Effect.void))
    return Effect.sync(() => cancelAnimationFrame(handle))
  },
)

/**
 * Completes after two animation frames, ensuring the browser has painted
 * the current state before proceeding. Used for CSS transition orchestration —
 * the double-rAF guarantees the "from" state is visible before transitioning
 * to the "to" state.
 *
 * @example
 * ```typescript
 * Task.nextFrame.pipe(Effect.as(TransitionFrameAdvanced()))
 * ```
 */
export const nextFrame: Effect.Effect<void> = Effect.callback<void>(resume => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resume(Effect.void)
    })
  })
})

/**
 * Waits for all CSS animations on the element matching the selector to settle.
 * Covers both CSS transitions and CSS keyframe animations via the Web Animations
 * API. Falls back to completing immediately if the element is missing or has no
 * active animations.
 *
 * Leave animations must be finite. `animation-iteration-count: infinite` will
 * keep the underlying `.finished` promise pending and hang the caller.
 *
 * @example
 * ```typescript
 * Task.waitForAnimationSettled('#menu-items').pipe(Effect.as(EndedAnimation()))
 * ```
 */
export const waitForAnimationSettled = (
  selector: string,
): Effect.Effect<void> =>
  Effect.callback<void>(resume => {
    requestAnimationFrame(async () => {
      const element = document.querySelector(selector)

      const animations =
        element instanceof HTMLElement ? element.getAnimations() : []

      await Promise.allSettled(animations.map(({ finished }) => finished))

      resume(Effect.void)
    })
  })

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
export const nextFrame: Effect.Effect<void> = Effect.async<void>(resume => {
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
  Effect.async<void>(resume => {
    requestAnimationFrame(async () => {
      const element = document.querySelector(selector)

      const animations =
        element instanceof HTMLElement ? element.getAnimations() : []

      await Promise.allSettled(animations.map(({ finished }) => finished))

      resume(Effect.void)
    })
  })

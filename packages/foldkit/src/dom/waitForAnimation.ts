import { Effect } from 'effect'

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
 * Dom.waitForAnimationSettled('#menu-items').pipe(Effect.as(EndedAnimation()))
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

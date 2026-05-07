import { Effect } from 'effect'

/**
 * Completes after the runtime's next render commits. The runtime batches
 * renders to `requestAnimationFrame`, so a Command, Subscription, or other
 * Effect that runs immediately after a dirtying Message would otherwise
 * query the DOM before the matching VDOM patch has applied. Yield this
 * before any DOM read or write whose target was just brought into existence
 * (or moved, or had its attributes changed) by the same Message.
 *
 * The `Dom` helpers (`focus`, `clickElement`, `scrollIntoView`, etc.)
 * already gate themselves with this internally; reach for `afterCommit`
 * directly when building custom Commands or DOM-observing Subscriptions
 * that need the same guarantee.
 *
 * @example
 * ```typescript
 * Effect.gen(function* () {
 *   yield* Render.afterCommit
 *   const element = document.getElementById(id)
 *   // element reflects the post-Message DOM
 * })
 * ```
 */
export const afterCommit: Effect.Effect<void> = Effect.callback<void>(
  resume => {
    const handle = requestAnimationFrame(() => resume(Effect.void))
    return Effect.sync(() => cancelAnimationFrame(handle))
  },
)

/**
 * Completes after the prior state has been painted to the screen. Waits two
 * animation frames: the first lets the runtime commit the latest model to
 * the DOM and the browser paint it, the second resumes once that paint is
 * visible. Use this for CSS transition orchestration where the from-state
 * must be displayed before the to-state changes are applied, otherwise the
 * browser collapses both states into a single frame and the transition does
 * not play.
 *
 * @example
 * ```typescript
 * Render.afterPaint.pipe(Effect.as(TransitionFrameAdvanced()))
 * ```
 */
export const afterPaint: Effect.Effect<void> = Effect.callback<void>(resume => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resume(Effect.void)
    })
  })
})

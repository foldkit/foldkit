import { Effect, Option } from 'effect'

import { RenderCommit } from './commit.js'

const nextAnimationFrame: Effect.Effect<void> = Effect.callback<void>(
  resume => {
    const handle = requestAnimationFrame(() => resume(Effect.void))
    return Effect.sync(() => cancelAnimationFrame(handle))
  },
)

const awaitCommitOrFrame = (
  renderCommit: typeof RenderCommit.Service,
): Effect.Effect<void> =>
  // NOTE: the pending check and the registration share one synchronous body,
  // so no commit can land between them. Split across two Effects this would
  // depend on which scheduler is installed: a fiber can yield anywhere on its
  // op budget, and it is only safe today because Foldkit gives these fibers a
  // microtask scheduler while every commit fires from a macrotask (an
  // animation frame, or a View Transition update callback), and a macrotask
  // cannot interleave a pending microtask continuation. Under Effect's default
  // `setTimeout` browser scheduler that argument collapses and the split
  // version is racy, so fusing them is insurance rather than tidiness.
  Effect.callback<void>(resume => {
    if (renderCommit.isCommitPending()) {
      const unsubscribe = renderCommit.onNextCommit(() => resume(Effect.void))
      return Effect.sync(unsubscribe)
    }

    const handle = requestAnimationFrame(() => resume(Effect.void))
    return Effect.sync(() => cancelAnimationFrame(handle))
  })

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
 * When the runtime has a patch outstanding, this waits for that patch and
 * nothing else, so it holds even when the frame renders inside a View
 * Transition and the browser decides when the patch applies. With nothing
 * outstanding the DOM already matches the Model, and this yields one frame
 * to the browser.
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
export const afterCommit: Effect.Effect<void> = Effect.gen(function* () {
  const maybeRenderCommit = yield* Effect.serviceOption(RenderCommit)

  return yield* Option.match(maybeRenderCommit, {
    onNone: () => nextAnimationFrame,
    onSome: awaitCommitOrFrame,
  })
})

/**
 * Completes after the prior state has been painted to the screen. Waits for
 * the runtime's next commit and then one further animation frame, which
 * resumes once that commit's paint is visible. Use this for CSS transition
 * orchestration where the from-state must be displayed before the to-state
 * changes are applied, otherwise the browser collapses both states into a
 * single frame and the transition does not play.
 *
 * @example
 * ```typescript
 * Render.afterPaint
 * ```
 */
export const afterPaint: Effect.Effect<void> = Effect.gen(function* () {
  yield* afterCommit
  yield* nextAnimationFrame
})

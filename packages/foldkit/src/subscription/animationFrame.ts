import { Effect, Queue, Stream } from 'effect'

/**
 * A cold Stream that emits the elapsed milliseconds on every
 * `requestAnimationFrame` tick. Each subscriber owns its animation frame loop,
 * and ending the Stream cancels the pending frame.
 *
 * The browser pauses `requestAnimationFrame` when the tab is hidden, so the
 * first elapsed value after it becomes visible may be large. Cap the value in
 * the Subscription handler when the update uses it for motion or physics.
 *
 * @example
 * ```ts
 * const FrameLayer = subscriptions.frame.toLayer(
 *   Effect.succeed(({ isActive }) =>
 *     isActive
 *       ? Subscription.animationFrameStream.pipe(
 *           Stream.map(deltaTime => Message.Ticked({ deltaTime })),
 *         )
 *       : Stream.empty,
 *   ),
 * )
 * ```
 */
export const animationFrameStream: Stream.Stream<number> =
  Stream.callback<number>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const state = {
          frameId: 0,
          lastTime: performance.now(),
        }

        const tick = (now: number): void => {
          const deltaTime = now - state.lastTime
          state.lastTime = now
          Queue.offerUnsafe(queue, deltaTime)
          state.frameId = requestAnimationFrame(tick)
        }

        state.frameId = requestAnimationFrame(tick)
        return state
      }),
      state => Effect.sync(() => cancelAnimationFrame(state.frameId)),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

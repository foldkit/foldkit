import { Effect, Queue, Stream } from 'effect'

/**
 * Configuration for the `animationFrame` Subscription helper.
 *
 * `isActive(model)` controls whether the request-animation-frame loop is
 * scheduled at all. When it returns `false` (e.g. the game is paused, the
 * scene is static, or the canvas is offscreen), no rAF callbacks fire and
 * no Messages are emitted. The Subscription system automatically restarts
 * the loop when `isActive` flips back to `true`.
 */
export type AnimationFrameConfig<Model, Message> = Readonly<{
  isActive: (model: Model) => boolean
  toMessage: (deltaTime: number) => Message
}>

/**
 * The subscription record returned by `animationFrame`. Shape matches the
 * `{ modelToDependencies, dependenciesToStream }` form expected by
 * `Subscription.makeSubscriptions` field configs.
 */
export type AnimationFrameSubscription<Model, Message> = Readonly<{
  modelToDependencies: (model: Model) => boolean
  dependenciesToStream: (isActive: boolean) => Stream.Stream<Message>
}>

const makeAnimationFrameStream = <Message>(
  toMessage: (deltaTime: number) => Message,
): Stream.Stream<Message> =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const state = {
          frameId: 0,
          lastTime: performance.now(),
        }

        const tick = (now: number): void => {
          const deltaTime = now - state.lastTime
          state.lastTime = now
          Queue.offerUnsafe(queue, toMessage(deltaTime))
          state.frameId = requestAnimationFrame(tick)
        }

        state.frameId = requestAnimationFrame(tick)
        return state
      }),
      state => Effect.sync(() => cancelAnimationFrame(state.frameId)),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

/**
 * Build a Subscription field config that emits a Message on every
 * `requestAnimationFrame` tick, with the inter-frame delta in milliseconds.
 *
 * Pair with `S.Boolean` in the `SubscriptionDependencies` schema:
 *
 * @example
 * ```typescript
 * const SubscriptionDependencies = S.Struct({
 *   frame: S.Boolean,
 * })
 *
 * const subscriptions = Subscription.makeSubscriptions(SubscriptionDependencies)<
 *   Model,
 *   Message
 * >({
 *   frame: Subscription.animationFrame({
 *     isActive: model => model.isPlaying,
 *     toMessage: deltaTime => Tick({ deltaTime }),
 *   }),
 * })
 * ```
 *
 * The browser pauses `requestAnimationFrame` when the tab is hidden, so
 * `deltaTime` may spike on the first frame after the tab regains focus.
 * Clamp it in the update function if your simulation is sensitive to large
 * jumps.
 */
export const animationFrame = <Model, Message>(
  config: AnimationFrameConfig<Model, Message>,
): AnimationFrameSubscription<Model, Message> => ({
  modelToDependencies: model => config.isActive(model),
  dependenciesToStream: isActive =>
    Stream.when(
      makeAnimationFrameStream(config.toMessage),
      Effect.sync(() => isActive),
    ),
})

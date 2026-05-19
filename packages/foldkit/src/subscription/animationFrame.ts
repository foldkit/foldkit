import { Effect, Queue, Schema as S, Stream } from 'effect'

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
 * Build a Subscription that emits a Message on every
 * `requestAnimationFrame` tick, with the inter-frame delta in milliseconds.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(_entry => ({
 *   frame: Subscription.animationFrame({
 *     isActive: model => model.isPlaying,
 *     toMessage: deltaTime => Tick({ deltaTime }),
 *   }),
 * }))
 * ```
 *
 * The browser pauses `requestAnimationFrame` when the tab is hidden, so
 * `deltaTime` may spike to several seconds on the first frame after the
 * tab regains focus. If your `update` function multiplies `deltaTime`
 * against motion or physics, cap it to a reasonable maximum (32ms is
 * typical) before using it. Otherwise a multi-second `deltaTime` can send
 * moving objects flying across the screen in one frame.
 *
 * Returns an entry shape, not a branded Subscription. Pass it into
 * `Subscription.make` as an entry value.
 */
export const animationFrame = <Model, Message>(
  config: AnimationFrameConfig<Model, Message>,
) => ({
  dependenciesSchema: S.Struct({ isActive: S.Boolean }),
  modelToDependencies: (model: Model) => ({
    isActive: config.isActive(model),
  }),
  dependenciesToStream: ({ isActive }: { readonly isActive: boolean }) =>
    Stream.when(
      makeAnimationFrameStream(config.toMessage),
      Effect.sync(() => isActive),
    ),
})

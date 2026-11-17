import { Effect, Schema, Stream } from 'effect'

import { animationFrameTicks } from '../runtime/animationFrame.js'

/**
 * Configuration for the `animationFrameEntry` Subscription helper.
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
 * Build a Subscription entry that emits a Message on every
 * `requestAnimationFrame` tick, with the inter-frame delta in milliseconds.
 * Ticks can render before the current frame paints. The runtime advances
 * at most one render per frame this way and coalesces ticks into a render
 * that is already pending.
 * Frame timing is local to the application. Messages from later browser tasks
 * retain their next-frame scheduling.
 *
 * @example
 * ```typescript
 * const subscriptions = Subscription.make<Model, Message>()(_entry => ({
 *   frame: Subscription.animationFrameEntry({
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
export const animationFrameEntry = <Model, Message>(
  config: AnimationFrameConfig<Model, Message>,
) => ({
  dependenciesSchema: Schema.Struct({ isActive: Schema.Boolean }),
  modelToDependencies: (model: Model) => ({
    isActive: config.isActive(model),
  }),
  dependenciesToStream: ({ isActive }: { readonly isActive: boolean }) =>
    Stream.when(
      Stream.map(animationFrameTicks, config.toMessage),
      Effect.sync(() => isActive),
    ),
})

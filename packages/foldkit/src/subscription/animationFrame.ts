import { Effect, Queue, Schema, Stream } from 'effect'

import {
  beginAnimationFrameCallbackPhase,
  endAnimationFrameCallbackPhase,
} from '../runtime/animationFramePhase.js'

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

const makeAnimationFrameStream = <Message>(
  toMessage: (deltaTime: number) => Message,
): Stream.Stream<Message> =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const endPhaseChannel = new MessageChannel()
        const state = {
          frameId: 0,
          lastTime: performance.now(),
          endPhaseChannel,
          isPhaseEndReleased: false,
        }
        endPhaseChannel.port2.onmessage = () => {
          if (state.isPhaseEndReleased) {
            return
          }
          endAnimationFrameCallbackPhase()
        }

        const tick = (now: number): void => {
          beginAnimationFrameCallbackPhase()
          try {
            const deltaTime = now - state.lastTime
            state.lastTime = now
            Queue.offerUnsafe(queue, toMessage(deltaTime))
            state.frameId = requestAnimationFrame(tick)
          } finally {
            endPhaseChannel.port1.postMessage(null)
          }
        }

        state.frameId = requestAnimationFrame(tick)
        return state
      }),
      state =>
        Effect.sync(() => {
          state.isPhaseEndReleased = true
          cancelAnimationFrame(state.frameId)
          state.endPhaseChannel.port1.close()
          state.endPhaseChannel.port2.close()
        }),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

/**
 * Build a Subscription entry that emits a Message on every
 * `requestAnimationFrame` tick, with the inter-frame delta in milliseconds.
 * The runtime renders the Model that tick produced before the browser
 * paints the frame, so the view keeps up with the display.
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
      makeAnimationFrameStream(config.toMessage),
      Effect.sync(() => isActive),
    ),
})

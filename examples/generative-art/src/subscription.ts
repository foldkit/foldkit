import { Effect, Option, Queue, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Slider } from '@foldkit/ui'

import { Message } from './message'
import type { Model } from './model'

const flowStrengthSliderSubscriptions = Subscription.lift({
  flowStrengthSliderPointer: Slider.subscriptions.dragPointer,
  flowStrengthSliderEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  read: model => Option.some(model.flowStrengthSlider),
  toParentMessage: message => Message.GotFlowStrengthSliderMessage({ message }),
})

const noiseScaleSliderSubscriptions = Subscription.lift({
  noiseScaleSliderPointer: Slider.subscriptions.dragPointer,
  noiseScaleSliderEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  read: model => Option.some(model.noiseScaleSlider),
  toParentMessage: message => Message.GotNoiseScaleSliderMessage({ message }),
})

const frameSubscription = Subscription.make<Model, Message>()(entry => ({
  frame: entry(
    'WatchAnimationFrames',
    { isActive: Schema.Boolean },
    {
      modelToDependencies: model => ({ isActive: model.isRunning }),
    },
  ),
}))

const makeAnimationFrameStream = (): Stream.Stream<Message> =>
  Stream.callback<Message>(queue =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const state = {
          frameId: 0,
          lastTime: performance.now(),
        }

        const tick = (now: number): void => {
          const deltaTimeMs = now - state.lastTime
          state.lastTime = now
          Queue.offerUnsafe(queue, Message.TickedFrame({ deltaTimeMs }))
          state.frameId = requestAnimationFrame(tick)
        }

        state.frameId = requestAnimationFrame(tick)
        return state
      }),
      state => Effect.sync(() => cancelAnimationFrame(state.frameId)),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )

export const WatchAnimationFramesLive = frameSubscription.frame.toLayer(
  ({ isActive }) =>
    Stream.when(
      makeAnimationFrameStream(),
      Effect.sync(() => isActive),
    ),
)

export const subscriptions = Subscription.aggregate(
  frameSubscription,
  flowStrengthSliderSubscriptions,
  noiseScaleSliderSubscriptions,
)

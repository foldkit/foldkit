import { Effect, Option, Schema, Stream } from 'effect'
import { Dom, Subscription } from 'foldkit'

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
  animationFrameTicks: entry(
    'AnimationFrameTicks',
    { isActive: Schema.Boolean },
    {
      messages: [Message.TickedFrame],
      modelToDependencies: model => ({ isActive: model.isRunning }),
      handler: function* () {
        return ({ isActive }) =>
          Stream.when(
            Dom.animationFrameTicks.pipe(
              Stream.map(deltaTimeMs => Message.TickedFrame({ deltaTimeMs })),
            ),
            Effect.sync(() => isActive),
          )
      },
    },
  ),
}))

export const subscriptions = Subscription.aggregate(
  frameSubscription,
  flowStrengthSliderSubscriptions,
  noiseScaleSliderSubscriptions,
)

import { Subscription } from 'foldkit'

import { Slider } from '@foldkit/ui'

import { Message } from './message'
import type { Model } from './model'

const flowStrengthSliderSubscriptions = Subscription.lift({
  flowStrengthSliderPointer: Slider.subscriptions.dragPointer,
  flowStrengthSliderEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.flowStrengthSlider,
  toParentMessage: message => Message.GotFlowStrengthSliderMessage({ message }),
})

const noiseScaleSliderSubscriptions = Subscription.lift({
  noiseScaleSliderPointer: Slider.subscriptions.dragPointer,
  noiseScaleSliderEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.noiseScaleSlider,
  toParentMessage: message => Message.GotNoiseScaleSliderMessage({ message }),
})

const frameSubscription = Subscription.make<Model, Message>()(_entry => ({
  frame: Subscription.animationFrame({
    isActive: model => model.isRunning,
    toMessage: deltaTimeMs => Message.TickedFrame({ deltaTimeMs }),
  }),
}))

export const subscriptions = Subscription.aggregate<Model, Message>()(
  frameSubscription,
  flowStrengthSliderSubscriptions,
  noiseScaleSliderSubscriptions,
)

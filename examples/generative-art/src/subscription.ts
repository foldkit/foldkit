import { Slider } from '@foldkit/ui'
import { Subscription } from 'foldkit'

import {
  GotFlowStrengthSliderMessage,
  GotNoiseScaleSliderMessage,
  TickedFrame,
} from './message'
import type { Message } from './message'
import type { Model } from './model'

const flowStrengthSliderSubscriptions = Subscription.lift({
  flowStrengthSliderPointer: Slider.subscriptions.dragPointer,
  flowStrengthSliderEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.flowStrengthSlider,
  toParentMessage: message => GotFlowStrengthSliderMessage({ message }),
})

const noiseScaleSliderSubscriptions = Subscription.lift({
  noiseScaleSliderPointer: Slider.subscriptions.dragPointer,
  noiseScaleSliderEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.noiseScaleSlider,
  toParentMessage: message => GotNoiseScaleSliderMessage({ message }),
})

const frameSubscription = Subscription.make<Model, Message>()(_entry => ({
  frame: Subscription.animationFrame({
    isActive: model => model.isRunning,
    toMessage: deltaTimeMs => TickedFrame({ deltaTimeMs }),
  }),
}))

export const subscriptions = Subscription.aggregate<Model, Message>()(
  frameSubscription,
  flowStrengthSliderSubscriptions,
  noiseScaleSliderSubscriptions,
)

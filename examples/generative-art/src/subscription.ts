import { Subscription, Ui } from 'foldkit'

import {
  GotFlowStrengthSliderMessage,
  GotNoiseScaleSliderMessage,
  TickedFrame,
} from './message'
import type { Message } from './message'
import type { Model } from './model'

const flowStrengthSliderSubscriptions = Subscription.lift({
  flowStrengthSliderPointer: Ui.Slider.subscriptions.dragPointer,
  flowStrengthSliderEscape: Ui.Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.flowStrengthSlider,
  toParentMessage: message => GotFlowStrengthSliderMessage({ message }),
})

const noiseScaleSliderSubscriptions = Subscription.lift({
  noiseScaleSliderPointer: Ui.Slider.subscriptions.dragPointer,
  noiseScaleSliderEscape: Ui.Slider.subscriptions.dragEscape,
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

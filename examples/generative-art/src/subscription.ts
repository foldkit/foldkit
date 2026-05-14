import { Schema as S, Stream } from 'effect'
import { Subscription, Ui } from 'foldkit'

import {
  GotFlowStrengthSliderMessage,
  GotNoiseScaleSliderMessage,
  TickedFrame,
} from './message'
import type { Message } from './message'
import type { Model } from './model'

const sliderFields = Ui.Slider.SubscriptionDependencies.fields

const SubscriptionDependencies = S.Struct({
  frame: S.Boolean,
  flowStrengthSliderPointer: sliderFields['dragPointer'],
  flowStrengthSliderEscape: sliderFields['dragEscape'],
  noiseScaleSliderPointer: sliderFields['dragPointer'],
  noiseScaleSliderEscape: sliderFields['dragEscape'],
})

const mapFlowStrengthStream = (stream: Stream.Stream<Ui.Slider.Message>) =>
  stream.pipe(Stream.map(message => GotFlowStrengthSliderMessage({ message })))

const mapNoiseScaleStream = (stream: Stream.Stream<Ui.Slider.Message>) =>
  stream.pipe(Stream.map(message => GotNoiseScaleSliderMessage({ message })))

export const subscriptions = Subscription.makeSubscriptions(
  SubscriptionDependencies,
)<Model, Message>({
  frame: Subscription.animationFrame({
    isActive: model => model.isRunning,
    toMessage: deltaTimeMs => TickedFrame({ deltaTimeMs }),
  }),
  flowStrengthSliderPointer: {
    modelToDependencies: model =>
      Ui.Slider.subscriptions.dragPointer.modelToDependencies(
        model.flowStrengthSlider,
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapFlowStrengthStream(
        Ui.Slider.subscriptions.dragPointer.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
  flowStrengthSliderEscape: {
    modelToDependencies: model =>
      Ui.Slider.subscriptions.dragEscape.modelToDependencies(
        model.flowStrengthSlider,
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapFlowStrengthStream(
        Ui.Slider.subscriptions.dragEscape.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
  noiseScaleSliderPointer: {
    modelToDependencies: model =>
      Ui.Slider.subscriptions.dragPointer.modelToDependencies(
        model.noiseScaleSlider,
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapNoiseScaleStream(
        Ui.Slider.subscriptions.dragPointer.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
  noiseScaleSliderEscape: {
    modelToDependencies: model =>
      Ui.Slider.subscriptions.dragEscape.modelToDependencies(
        model.noiseScaleSlider,
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapNoiseScaleStream(
        Ui.Slider.subscriptions.dragEscape.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
})

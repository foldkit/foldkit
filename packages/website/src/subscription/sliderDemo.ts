import { Schema as S, Stream } from 'effect'
import { Subscription, Ui } from 'foldkit'

import type { Model } from '../main'
import { GotUiPageMessage, type Message } from '../message'
import {
  GotSliderRatingDemoMessage,
  GotSliderVolumeDemoMessage,
} from '../page/ui/message'

const sliderFields = Ui.Slider.SubscriptionDependencies.fields

export const SubscriptionDependencies = S.Struct({
  ratingPointer: sliderFields['dragPointer'],
  ratingEscape: sliderFields['dragEscape'],
  volumePointer: sliderFields['dragPointer'],
  volumeEscape: sliderFields['dragEscape'],
})

const sliderSubscriptions = Ui.Slider.subscriptions

const getRatingModel = (model: Model) => model.uiPages.sliderRatingDemo
const getVolumeModel = (model: Model) => model.uiPages.sliderVolumeDemo

const mapRatingStream = (stream: Stream.Stream<Ui.Slider.Message>) =>
  stream.pipe(
    Stream.map(message =>
      GotUiPageMessage({
        message: GotSliderRatingDemoMessage({ message }),
      }),
    ),
  )

const mapVolumeStream = (stream: Stream.Stream<Ui.Slider.Message>) =>
  stream.pipe(
    Stream.map(message =>
      GotUiPageMessage({
        message: GotSliderVolumeDemoMessage({ message }),
      }),
    ),
  )

export const subscriptions = Subscription.makeSubscriptions(
  SubscriptionDependencies,
)<Model, Message>({
  ratingPointer: {
    modelToDependencies: model =>
      sliderSubscriptions.dragPointer.modelToDependencies(
        getRatingModel(model),
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapRatingStream(
        sliderSubscriptions.dragPointer.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
  ratingEscape: {
    modelToDependencies: model =>
      sliderSubscriptions.dragEscape.modelToDependencies(getRatingModel(model)),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapRatingStream(
        sliderSubscriptions.dragEscape.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
  volumePointer: {
    modelToDependencies: model =>
      sliderSubscriptions.dragPointer.modelToDependencies(
        getVolumeModel(model),
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapVolumeStream(
        sliderSubscriptions.dragPointer.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
  volumeEscape: {
    modelToDependencies: model =>
      sliderSubscriptions.dragEscape.modelToDependencies(getVolumeModel(model)),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapVolumeStream(
        sliderSubscriptions.dragEscape.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
})

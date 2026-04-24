import { Schema as S, Stream } from 'effect'
import { Subscription, Ui } from 'foldkit'

import type { Model } from '../main'
import { GotUiPageMessage, type Message } from '../message'
import {
  GotSliderRatingDemoMessage,
  GotSliderVolumeDemoMessage,
} from '../page/ui/message'

const sliderFields = Ui.Slider.SubscriptionDeps.fields

export const SubscriptionDeps = S.Struct({
  ratingPointer: sliderFields['documentPointer'],
  ratingEscape: sliderFields['documentEscape'],
  volumePointer: sliderFields['documentPointer'],
  volumeEscape: sliderFields['documentEscape'],
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

export const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  ratingPointer: {
    modelToDependencies: model =>
      sliderSubscriptions.documentPointer.modelToDependencies(
        getRatingModel(model),
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapRatingStream(
        sliderSubscriptions.documentPointer.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
  ratingEscape: {
    modelToDependencies: model =>
      sliderSubscriptions.documentEscape.modelToDependencies(
        getRatingModel(model),
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapRatingStream(
        sliderSubscriptions.documentEscape.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
  volumePointer: {
    modelToDependencies: model =>
      sliderSubscriptions.documentPointer.modelToDependencies(
        getVolumeModel(model),
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapVolumeStream(
        sliderSubscriptions.documentPointer.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
  volumeEscape: {
    modelToDependencies: model =>
      sliderSubscriptions.documentEscape.modelToDependencies(
        getVolumeModel(model),
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      mapVolumeStream(
        sliderSubscriptions.documentEscape.dependenciesToStream(
          dependencies,
          readDependencies,
        ),
      ),
  },
})

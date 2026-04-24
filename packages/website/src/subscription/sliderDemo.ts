import { Schema as S, Stream } from 'effect'
import { Subscription, Ui } from 'foldkit'

import type { Model } from '../main'
import { GotUiPageMessage, type Message } from '../message'
import {
  GotSliderPainDemoMessage,
  GotSliderVolumeDemoMessage,
} from '../page/ui/message'

const sliderFields = Ui.Slider.SubscriptionDeps.fields

export const SubscriptionDeps = S.Struct({
  painPointer: sliderFields['documentPointer'],
  painEscape: sliderFields['documentEscape'],
  volumePointer: sliderFields['documentPointer'],
  volumeEscape: sliderFields['documentEscape'],
})

const sliderSubs = Ui.Slider.subscriptions

const getPainModel = (model: Model) => model.uiPages.sliderPainDemo
const getVolumeModel = (model: Model) => model.uiPages.sliderVolumeDemo

const mapPainStream = (stream: Stream.Stream<Ui.Slider.Message>) =>
  stream.pipe(
    Stream.map(message =>
      GotUiPageMessage({
        message: GotSliderPainDemoMessage({ message }),
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
  painPointer: {
    modelToDependencies: model =>
      sliderSubs.documentPointer.modelToDependencies(getPainModel(model)),
    dependenciesToStream: (deps, readDeps) =>
      mapPainStream(
        sliderSubs.documentPointer.dependenciesToStream(deps, readDeps),
      ),
  },
  painEscape: {
    modelToDependencies: model =>
      sliderSubs.documentEscape.modelToDependencies(getPainModel(model)),
    dependenciesToStream: (deps, readDeps) =>
      mapPainStream(
        sliderSubs.documentEscape.dependenciesToStream(deps, readDeps),
      ),
  },
  volumePointer: {
    modelToDependencies: model =>
      sliderSubs.documentPointer.modelToDependencies(getVolumeModel(model)),
    dependenciesToStream: (deps, readDeps) =>
      mapVolumeStream(
        sliderSubs.documentPointer.dependenciesToStream(deps, readDeps),
      ),
  },
  volumeEscape: {
    modelToDependencies: model =>
      sliderSubs.documentEscape.modelToDependencies(getVolumeModel(model)),
    dependenciesToStream: (deps, readDeps) =>
      mapVolumeStream(
        sliderSubs.documentEscape.dependenciesToStream(deps, readDeps),
      ),
  },
})

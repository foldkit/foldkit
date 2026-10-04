import { Option } from 'effect'
import { Subscription } from 'foldkit'

import { DragAndDrop, Slider } from '@foldkit/ui'

import { Toast } from './demo/toastModule'
import { Message } from './message'
import type { Model } from './model'

const dragAndDropSubscriptions = Subscription.lift({
  dragPointer: DragAndDrop.subscriptions.documentPointer,
  dragEscape: DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  read: model => Option.some(model.dragAndDropDemo),
  toParentMessage: message => Message.GotDragAndDropDemoMessage({ message }),
})

const sliderRatingSubscriptions = Subscription.lift({
  sliderRatingPointer: Slider.subscriptions.dragPointer,
  sliderRatingEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  read: model => Option.some(model.sliderRatingDemo),
  toParentMessage: message => Message.GotSliderRatingDemoMessage({ message }),
})

const sliderVolumeSubscriptions = Subscription.lift({
  sliderVolumePointer: Slider.subscriptions.dragPointer,
  sliderVolumeEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  read: model => Option.some(model.sliderVolumeDemo),
  toParentMessage: message => Message.GotSliderVolumeDemoMessage({ message }),
})

const toastDemoSubscriptions = Subscription.lift(Toast.subscriptions)<
  Model,
  Message
>({
  read: model => Option.some(model.toastDemo),
  toParentMessage: message => Message.GotToastDemoMessage({ message }),
})

export const subscriptions = Subscription.aggregate(
  dragAndDropSubscriptions,
  sliderRatingSubscriptions,
  sliderVolumeSubscriptions,
  toastDemoSubscriptions,
)

import { Subscription } from 'foldkit'

import { DragAndDrop, Slider, VirtualList } from '@foldkit/ui'

import { Message } from './message'
import type { Model } from './model'
import { Toast } from './toastModule'

const dragAndDropSubscriptions = Subscription.lift({
  dragPointer: DragAndDrop.subscriptions.documentPointer,
  dragEscape: DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  toChildModel: model => model.dragAndDropDemo,
  toParentMessage: message => Message.GotDragAndDropDemoMessage({ message }),
})

const sliderRatingSubscriptions = Subscription.lift({
  sliderRatingPointer: Slider.subscriptions.dragPointer,
  sliderRatingEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.sliderRatingDemo,
  toParentMessage: message => Message.GotSliderRatingDemoMessage({ message }),
})

const sliderVolumeSubscriptions = Subscription.lift({
  sliderVolumePointer: Slider.subscriptions.dragPointer,
  sliderVolumeEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.sliderVolumeDemo,
  toParentMessage: message => Message.GotSliderVolumeDemoMessage({ message }),
})

const virtualListDemoSubscriptions = Subscription.lift({
  virtualListContainerEvents: VirtualList.subscriptions.containerEvents,
})<Model, Message>({
  toChildModel: model => model.virtualListDemo,
  toParentMessage: message => Message.GotVirtualListDemoMessage({ message }),
})

const virtualListVariableDemoSubscriptions = Subscription.lift({
  virtualListVariableContainerEvents: VirtualList.subscriptions.containerEvents,
})<Model, Message>({
  toChildModel: model => model.virtualListVariableDemo,
  toParentMessage: message =>
    Message.GotVirtualListVariableDemoMessage({ message }),
})

const toastDemoSubscriptions = Subscription.lift(Toast.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.toastDemo,
  toParentMessage: message => Message.GotToastDemoMessage({ message }),
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
  dragAndDropSubscriptions,
  sliderRatingSubscriptions,
  sliderVolumeSubscriptions,
  virtualListDemoSubscriptions,
  virtualListVariableDemoSubscriptions,
  toastDemoSubscriptions,
)

import { Subscription, Ui } from 'foldkit'

import {
  GotDragAndDropDemoMessage,
  GotSliderRatingDemoMessage,
  GotSliderVolumeDemoMessage,
  GotVirtualListDemoMessage,
  GotVirtualListVariableDemoMessage,
  type Message,
} from './message'
import type { Model } from './model'

const dragAndDropSubscriptions = Subscription.lift({
  dragPointer: Ui.DragAndDrop.subscriptions.documentPointer,
  dragEscape: Ui.DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: Ui.DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: Ui.DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  toChildModel: model => model.dragAndDropDemo,
  toParentMessage: message => GotDragAndDropDemoMessage({ message }),
})

const sliderRatingSubscriptions = Subscription.lift({
  sliderRatingPointer: Ui.Slider.subscriptions.dragPointer,
  sliderRatingEscape: Ui.Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.sliderRatingDemo,
  toParentMessage: message => GotSliderRatingDemoMessage({ message }),
})

const sliderVolumeSubscriptions = Subscription.lift({
  sliderVolumePointer: Ui.Slider.subscriptions.dragPointer,
  sliderVolumeEscape: Ui.Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.sliderVolumeDemo,
  toParentMessage: message => GotSliderVolumeDemoMessage({ message }),
})

const virtualListDemoSubscriptions = Subscription.lift({
  virtualListContainerEvents: Ui.VirtualList.subscriptions.containerEvents,
})<Model, Message>({
  toChildModel: model => model.virtualListDemo,
  toParentMessage: message => GotVirtualListDemoMessage({ message }),
})

const virtualListVariableDemoSubscriptions = Subscription.lift({
  virtualListVariableContainerEvents:
    Ui.VirtualList.subscriptions.containerEvents,
})<Model, Message>({
  toChildModel: model => model.virtualListVariableDemo,
  toParentMessage: message => GotVirtualListVariableDemoMessage({ message }),
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
  dragAndDropSubscriptions,
  sliderRatingSubscriptions,
  sliderVolumeSubscriptions,
  virtualListDemoSubscriptions,
  virtualListVariableDemoSubscriptions,
)

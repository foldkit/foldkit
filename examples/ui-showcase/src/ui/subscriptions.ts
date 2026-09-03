import { Subscription } from 'foldkit'

import { DragAndDrop, Slider, VirtualList } from '@foldkit/ui'

import { Message as UiMessage } from './message'
import type { UiModel } from './model'
import { Toast } from './toast'

const dragAndDropSubscriptions = Subscription.lift({
  dragPointer: DragAndDrop.subscriptions.documentPointer,
  dragEscape: DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: DragAndDrop.subscriptions.autoScroll,
})<UiModel, UiMessage>({
  toChildModel: model => model.dragAndDropDemo,
  toParentMessage: message => UiMessage.GotDragAndDropDemoMessage({ message }),
})

const sliderRatingSubscriptions = Subscription.lift({
  sliderRatingPointer: Slider.subscriptions.dragPointer,
  sliderRatingEscape: Slider.subscriptions.dragEscape,
})<UiModel, UiMessage>({
  toChildModel: model => model.sliderRatingDemo,
  toParentMessage: message => UiMessage.GotSliderRatingDemoMessage({ message }),
})

const sliderVolumeSubscriptions = Subscription.lift({
  sliderVolumePointer: Slider.subscriptions.dragPointer,
  sliderVolumeEscape: Slider.subscriptions.dragEscape,
})<UiModel, UiMessage>({
  toChildModel: model => model.sliderVolumeDemo,
  toParentMessage: message => UiMessage.GotSliderVolumeDemoMessage({ message }),
})

const virtualListDemoSubscriptions = Subscription.lift({
  virtualListContainerEvents: VirtualList.subscriptions.containerEvents,
})<UiModel, UiMessage>({
  toChildModel: model => model.virtualListDemo,
  toParentMessage: message => UiMessage.GotVirtualListDemoMessage({ message }),
})

const virtualListVariableDemoSubscriptions = Subscription.lift({
  virtualListVariableContainerEvents: VirtualList.subscriptions.containerEvents,
})<UiModel, UiMessage>({
  toChildModel: model => model.virtualListVariableDemo,
  toParentMessage: message =>
    UiMessage.GotVirtualListVariableDemoMessage({ message }),
})

const toastDemoSubscriptions = Subscription.lift(Toast.subscriptions)<
  UiModel,
  UiMessage
>({
  toChildModel: model => model.toastDemo,
  toParentMessage: message => UiMessage.GotToastDemoMessage({ message }),
})

export const subscriptions = Subscription.aggregate<UiModel, UiMessage>()(
  dragAndDropSubscriptions,
  sliderRatingSubscriptions,
  sliderVolumeSubscriptions,
  virtualListDemoSubscriptions,
  virtualListVariableDemoSubscriptions,
  toastDemoSubscriptions,
)

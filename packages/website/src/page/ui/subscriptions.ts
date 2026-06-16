import { Subscription } from 'foldkit'

import { Dialog, DragAndDrop, Slider, VirtualList } from '@foldkit/ui'

import {
  GotDialogAnimatedDemoMessage,
  GotDialogDemoMessage,
  GotDragAndDropDemoMessage,
  GotNestedDialogChildDemoMessage,
  GotNestedDialogParentDemoMessage,
  GotOverlayDialogDemoMessage,
  GotSliderRatingDemoMessage,
  GotSliderVolumeDemoMessage,
  GotVirtualListDemoMessage,
  GotVirtualListVariableDemoMessage,
  type Message,
} from './message'
import type { Model } from './model'

const dialogDemoSubscriptions = Subscription.lift({
  dialogDemoLockScroll: Dialog.subscriptions.lockScroll,
})<Model, Message>({
  toChildModel: model => model.dialogDemo,
  toParentMessage: message => GotDialogDemoMessage({ message }),
})

const dialogAnimatedDemoSubscriptions = Subscription.lift({
  dialogAnimatedDemoLockScroll: Dialog.subscriptions.lockScroll,
})<Model, Message>({
  toChildModel: model => model.dialogAnimatedDemo,
  toParentMessage: message => GotDialogAnimatedDemoMessage({ message }),
})

const overlayDialogDemoSubscriptions = Subscription.lift({
  overlayDialogDemoLockScroll: Dialog.subscriptions.lockScroll,
})<Model, Message>({
  toChildModel: model => model.overlayDialogDemo,
  toParentMessage: message => GotOverlayDialogDemoMessage({ message }),
})

const nestedDialogParentDemoSubscriptions = Subscription.lift({
  nestedDialogParentDemoLockScroll: Dialog.subscriptions.lockScroll,
})<Model, Message>({
  toChildModel: model => model.nestedDialogParentDemo,
  toParentMessage: message => GotNestedDialogParentDemoMessage({ message }),
})

const nestedDialogChildDemoSubscriptions = Subscription.lift({
  nestedDialogChildDemoLockScroll: Dialog.subscriptions.lockScroll,
})<Model, Message>({
  toChildModel: model => model.nestedDialogChildDemo,
  toParentMessage: message => GotNestedDialogChildDemoMessage({ message }),
})

const dragAndDropSubscriptions = Subscription.lift({
  dragPointer: DragAndDrop.subscriptions.documentPointer,
  dragEscape: DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  toChildModel: model => model.dragAndDropDemo,
  toParentMessage: message => GotDragAndDropDemoMessage({ message }),
})

const sliderRatingSubscriptions = Subscription.lift({
  sliderRatingPointer: Slider.subscriptions.dragPointer,
  sliderRatingEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.sliderRatingDemo,
  toParentMessage: message => GotSliderRatingDemoMessage({ message }),
})

const sliderVolumeSubscriptions = Subscription.lift({
  sliderVolumePointer: Slider.subscriptions.dragPointer,
  sliderVolumeEscape: Slider.subscriptions.dragEscape,
})<Model, Message>({
  toChildModel: model => model.sliderVolumeDemo,
  toParentMessage: message => GotSliderVolumeDemoMessage({ message }),
})

const virtualListDemoSubscriptions = Subscription.lift({
  virtualListContainerEvents: VirtualList.subscriptions.containerEvents,
})<Model, Message>({
  toChildModel: model => model.virtualListDemo,
  toParentMessage: message => GotVirtualListDemoMessage({ message }),
})

const virtualListVariableDemoSubscriptions = Subscription.lift({
  virtualListVariableContainerEvents: VirtualList.subscriptions.containerEvents,
})<Model, Message>({
  toChildModel: model => model.virtualListVariableDemo,
  toParentMessage: message => GotVirtualListVariableDemoMessage({ message }),
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
  dialogDemoSubscriptions,
  dialogAnimatedDemoSubscriptions,
  overlayDialogDemoSubscriptions,
  nestedDialogParentDemoSubscriptions,
  nestedDialogChildDemoSubscriptions,
  dragAndDropSubscriptions,
  sliderRatingSubscriptions,
  sliderVolumeSubscriptions,
  virtualListDemoSubscriptions,
  virtualListVariableDemoSubscriptions,
)

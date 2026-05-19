import { Subscription, Ui } from 'foldkit'

import { GotDragAndDropMessage } from './message'
import type { Message } from './message'
import type { Model } from './model'

export const subscriptions = Subscription.lift({
  dragPointer: Ui.DragAndDrop.subscriptions.documentPointer,
  dragEscape: Ui.DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: Ui.DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: Ui.DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  toChildModel: model => model.dragAndDrop,
  toParentMessage: message => GotDragAndDropMessage({ message }),
})

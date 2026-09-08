import { Subscription } from 'foldkit'

import { DragAndDrop } from '@foldkit/ui'

import { Message } from './message'
import type { Model } from './model'

export const subscriptions = Subscription.lift({
  dragPointer: DragAndDrop.subscriptions.documentPointer,
  dragEscape: DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  toChildModel: model => model.dragAndDrop,
  toParentMessage: message => Message.GotDragAndDropMessage({ message }),
})

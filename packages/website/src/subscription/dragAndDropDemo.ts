import { Equivalence, Schema as S, Stream } from 'effect'
import { Subscription, Ui } from 'foldkit'

import type { Model } from '../main'
import { GotUiPageMessage, type Message } from '../message'
import { GotDragAndDropDemoMessage } from '../page/ui/message'

const dragAndDropFields = Ui.DragAndDrop.SubscriptionDeps.fields

export const SubscriptionDeps = S.Struct({
  dragPointer: dragAndDropFields['documentPointer'],
  dragEscape: dragAndDropFields['documentEscape'],
  dragKeyboard: dragAndDropFields['documentKeyboard'],
  autoScroll: dragAndDropFields['autoScroll'],
})

const dragAndDropSubscriptions = Ui.DragAndDrop.subscriptions

const mapDragStream = (stream: Stream.Stream<Ui.DragAndDrop.Message>) =>
  stream.pipe(
    Stream.map(message =>
      GotUiPageMessage({
        message: GotDragAndDropDemoMessage({ message }),
      }),
    ),
  )

const getDragAndDropModel = (model: Model) => model.uiPages.dragAndDropDemo

export const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  dragPointer: {
    modelToDependencies: model =>
      dragAndDropSubscriptions.documentPointer.modelToDependencies(
        getDragAndDropModel(model),
      ),
    dependenciesToStream: (deps, readDependencies) =>
      mapDragStream(
        dragAndDropSubscriptions.documentPointer.dependenciesToStream(
          deps,
          readDependencies,
        ),
      ),
  },

  dragEscape: {
    modelToDependencies: model =>
      dragAndDropSubscriptions.documentEscape.modelToDependencies(
        getDragAndDropModel(model),
      ),
    dependenciesToStream: (deps, readDependencies) =>
      mapDragStream(
        dragAndDropSubscriptions.documentEscape.dependenciesToStream(
          deps,
          readDependencies,
        ),
      ),
  },

  dragKeyboard: {
    modelToDependencies: model =>
      dragAndDropSubscriptions.documentKeyboard.modelToDependencies(
        getDragAndDropModel(model),
      ),
    dependenciesToStream: (deps, readDependencies) =>
      mapDragStream(
        dragAndDropSubscriptions.documentKeyboard.dependenciesToStream(
          deps,
          readDependencies,
        ),
      ),
  },

  autoScroll: {
    modelToDependencies: model =>
      dragAndDropSubscriptions.autoScroll.modelToDependencies(
        getDragAndDropModel(model),
      ),
    equivalence: Equivalence.Struct({ isDragging: Equivalence.Boolean }),
    dependenciesToStream: (deps, readDependencies) =>
      mapDragStream(
        dragAndDropSubscriptions.autoScroll.dependenciesToStream(
          deps,
          readDependencies,
        ),
      ),
  },
})

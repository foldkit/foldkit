import { Equivalence, Schema as S, Stream } from 'effect'
import { Subscription, Ui } from 'foldkit'

import { GotDragAndDropMessage } from './message'
import type { Message } from './message'
import type { Model } from './model'

const dragAndDropFields = Ui.DragAndDrop.SubscriptionDeps.fields

export const SubscriptionDeps = S.Struct({
  dragPointer: dragAndDropFields['documentPointer'],
  dragEscape: dragAndDropFields['documentEscape'],
  dragKeyboard: dragAndDropFields['documentKeyboard'],
  autoScroll: dragAndDropFields['autoScroll'],
})

const dragAndDropSubscriptions = Ui.DragAndDrop.subscriptions

const mapDragStream = (stream: Stream.Stream<Ui.DragAndDrop.Message>) =>
  stream.pipe(Stream.map(message => GotDragAndDropMessage({ message })))

export const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  dragPointer: {
    modelToDependencies: model =>
      dragAndDropSubscriptions.documentPointer.modelToDependencies(
        model.dragAndDrop,
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
        model.dragAndDrop,
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
        model.dragAndDrop,
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
        model.dragAndDrop,
      ),
    equivalence: Equivalence.struct({ isDragging: Equivalence.boolean }),
    dependenciesToStream: (deps, readDependencies) =>
      mapDragStream(
        dragAndDropSubscriptions.autoScroll.dependenciesToStream(
          deps,
          readDependencies,
        ),
      ),
  },
})

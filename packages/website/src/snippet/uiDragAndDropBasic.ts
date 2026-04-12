import { Effect, Match as M, Option, Schema as S, Stream } from 'effect'
import { Command, Subscription, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, li, span, ul } from './html'

// MODEL

const Model = S.Struct({
  items: S.Array(S.Struct({ id: S.String, label: S.String })),
  dragAndDrop: Ui.DragAndDrop.Model,
})

// INIT

const init = () => [
  {
    items: [
      { id: '1', label: 'First' },
      { id: '2', label: 'Second' },
      { id: '3', label: 'Third' },
    ],
    dragAndDrop: Ui.DragAndDrop.init({ id: 'sortable-list' }),
  },
  [],
]

// MESSAGE

const GotDragAndDropMessage = m('GotDragAndDropMessage', {
  message: Ui.DragAndDrop.Message,
})

// UPDATE — three-tuple return with OutMessage handling

GotDragAndDropMessage: ({ message: dragMessage }) => {
  const [nextDragAndDrop, dragCommands, maybeOutMessage] =
    Ui.DragAndDrop.update(model.dragAndDrop, dragMessage)

  const mappedCommands = dragCommands.map(
    Command.mapEffect(
      Effect.map(message => GotDragAndDropMessage({ message })),
    ),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { dragAndDrop: () => nextDragAndDrop }),
      mappedCommands,
    ],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        M.tagsExhaustive({
          Reordered: ({ itemId, fromIndex, toIndex }) => [
            evo(model, {
              // reorder is your own function that moves the item
              items: () => reorder(model.items, itemId, fromIndex, toIndex),
              dragAndDrop: () => nextDragAndDrop,
            }),
            mappedCommands,
          ],
          Cancelled: () => [
            evo(model, { dragAndDrop: () => nextDragAndDrop }),
            mappedCommands,
          ],
        }),
      ),
  })
}

// SUBSCRIPTIONS — forward all four document-level listeners

const dragAndDropSubs = Ui.DragAndDrop.subscriptions

const mapDragStream = stream =>
  stream.pipe(Stream.map(message => GotDragAndDropMessage({ message })))

const dragFields = Ui.DragAndDrop.SubscriptionDeps.fields

const SubscriptionDeps = S.Struct({
  dragPointer: dragFields['documentPointer'],
  dragEscape: dragFields['documentEscape'],
  dragKeyboard: dragFields['documentKeyboard'],
  autoScroll: dragFields['autoScroll'],
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)({
  dragPointer: {
    modelToDependencies: model =>
      dragAndDropSubs.documentPointer.modelToDependencies(model.dragAndDrop),
    dependenciesToStream: (deps, readDeps) =>
      mapDragStream(
        dragAndDropSubs.documentPointer.dependenciesToStream(deps, readDeps),
      ),
  },
  dragEscape: {
    modelToDependencies: model =>
      dragAndDropSubs.documentEscape.modelToDependencies(model.dragAndDrop),
    dependenciesToStream: (deps, readDeps) =>
      mapDragStream(
        dragAndDropSubs.documentEscape.dependenciesToStream(deps, readDeps),
      ),
  },
  dragKeyboard: {
    modelToDependencies: model =>
      dragAndDropSubs.documentKeyboard.modelToDependencies(model.dragAndDrop),
    dependenciesToStream: (deps, readDeps) =>
      mapDragStream(
        dragAndDropSubs.documentKeyboard.dependenciesToStream(deps, readDeps),
      ),
  },
  autoScroll: {
    modelToDependencies: model =>
      dragAndDropSubs.autoScroll.modelToDependencies(model.dragAndDrop),
    dependenciesToStream: (deps, readDeps) =>
      mapDragStream(
        dragAndDropSubs.autoScroll.dependenciesToStream(deps, readDeps),
      ),
  },
})

// VIEW — spread draggable() onto items, droppable() onto containers

ul(
  [
    ...Ui.DragAndDrop.droppable('list', 'Sortable items'),
    Class('flex flex-col gap-2'),
  ],
  model.items.map((item, index) =>
    li(
      [
        ...Ui.DragAndDrop.draggable({
          model: model.dragAndDrop,
          toParentMessage: message => GotDragAndDropMessage({ message }),
          itemId: item.id,
          containerId: 'list',
          index,
        }),
        Class('p-3 rounded-lg border cursor-grab'),
      ],
      [span([], [item.label])],
    ),
  ),
)

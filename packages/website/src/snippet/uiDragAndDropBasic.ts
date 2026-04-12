import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, div, li, span, ul } from './html'

// Submodel wiring:
//   Model field: dragAndDrop: Ui.DragAndDrop.Model
//   Init: Ui.DragAndDrop.init({ id: 'board' })
//   Subscriptions: Ui.DragAndDrop.subscriptions (document-level listeners)
//   Update: delegate via Ui.DragAndDrop.update — returns [model, commands, maybeOutMessage]

const GotDragAndDropMessage = m('GotDragAndDropMessage', {
  message: Ui.DragAndDrop.Message,
})

// Spread draggable() onto list items:
li(
  [
    ...Ui.DragAndDrop.draggable({
      model: model.dragAndDrop,
      toParentMessage: message => GotDragAndDropMessage({ message }),
      itemId: card.id,
      containerId: column.id,
      index,
    }),
    Class('p-3 rounded-lg border'),
  ],
  [span([], [card.label])],
)

// Spread droppable() onto containers:
ul(
  [
    ...Ui.DragAndDrop.droppable(column.id, column.name),
    Class('flex flex-col gap-2'),
  ],
  cardElements,
)

// Handle the OutMessage in your update function:
//   Option.match(maybeOutMessage, {
//     onNone: () => ...,
//     onSome: Match.tagsExhaustive({
//       Reordered: ({ itemId, fromContainerId, toContainerId, toIndex }) => ...,
//       Cancelled: () => ...,
//     }),
//   })

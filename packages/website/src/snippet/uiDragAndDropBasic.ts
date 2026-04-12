import { Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, li, span, ul } from './html'

// MODEL — embed DragAndDrop.Model alongside your own data

const Model = S.Struct({
  items: S.Array(S.Struct({ id: S.String, label: S.String })),
  dragAndDrop: Ui.DragAndDrop.Model,
})

// MESSAGE — wrap DragAndDrop.Message in your parent Message

const GotDragAndDropMessage = m('GotDragAndDropMessage', {
  message: Ui.DragAndDrop.Message,
})

// INIT — initialize alongside your data

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
    onSome: M.type<Ui.DragAndDrop.OutMessage>().pipe(
      M.tagsExhaustive({
        Reordered: ({ itemId, toIndex }) => [
          evo(model, {
            items: () => reorder(model.items, itemId, toIndex),
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

// SUBSCRIPTIONS — forward document-level listeners
// DragAndDrop requires four subscriptions: documentPointer, documentEscape,
// documentKeyboard, and autoScroll. Map each stream through your wrapper
// Message. See the Kanban example for the full subscription wiring.

// VIEW — spread draggable() onto items, droppable() onto containers

ul(
  [
    ...Ui.DragAndDrop.droppable('list', 'Sortable items'),
    Class('flex flex-col gap-2'),
  ],
  items.map((item, index) =>
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

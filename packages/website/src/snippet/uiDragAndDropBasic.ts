// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit each into your own Model, init, Message,
// update, subscriptions, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Command, Subscription, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the DragAndDrop Submodel plus the items being sorted:
const Model = S.Struct({
  items: S.Array(S.Struct({ id: S.String, label: S.String })),
  dragAndDrop: Ui.DragAndDrop.Model,
  // ...your other fields
})

// In your init function, initialize the DragAndDrop Submodel with a unique id:
const init = () => [
  {
    items: [
      { id: '1', label: 'First' },
      { id: '2', label: 'Second' },
      { id: '3', label: 'Third' },
    ],
    dragAndDrop: Ui.DragAndDrop.init({ id: 'sortable-list' }),
    // ...your other fields
  },
  [],
]

// Embed the DragAndDrop Message in your parent Message:
const GotDragAndDropMessage = m('GotDragAndDropMessage', {
  message: Ui.DragAndDrop.Message,
})

// Inside your update function's M.tagsExhaustive({...}), DragAndDrop.update
// returns a three-tuple: [model, commands, maybeOutMessage]. Handle the
// Reordered OutMessage to apply the move to your own list:
GotDragAndDropMessage: ({ message: dragMessage }) => {
  const [nextDragAndDrop, dragCommands, maybeOutMessage] =
    Ui.DragAndDrop.update(model.dragAndDrop, dragMessage)

  const mappedCommands = Command.mapMessages(dragCommands, message =>
    GotDragAndDropMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      // Merge the next state into your Model:
      evo(model, { dragAndDrop: () => nextDragAndDrop }),
      // Forward the Submodel's Commands through your parent Message:
      mappedCommands,
    ],
    onSome: outMessage =>
      M.value(outMessage).pipe(
        M.tagsExhaustive({
          Reordered: ({ itemId, fromIndex, toIndex }) => [
            // Merge the next state into your Model:
            evo(model, {
              // reorder is your own function that moves the item
              items: () => reorder(model.items, itemId, fromIndex, toIndex),
              dragAndDrop: () => nextDragAndDrop,
            }),
            // Forward the Submodel's Commands through your parent Message:
            mappedCommands,
          ],
          Cancelled: () => [
            // The child has emitted `Cancelled`. The body commits
            // the child's next state as usual. In this arm the
            // parent can also update its own state or dispatch its
            // own Commands, for example revert an optimistic UI
            // change, log analytics, or trigger a downstream
            // Command.
            evo(model, { dragAndDrop: () => nextDragAndDrop }),
            mappedCommands,
          ],
        }),
      ),
  })
}

// In your subscriptions, lift all four document-level listeners through
// Subscription.lift in one shot:
const dragAndDropSubscriptions = Subscription.lift({
  dragPointer: Ui.DragAndDrop.subscriptions.documentPointer,
  dragEscape: Ui.DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: Ui.DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: Ui.DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  toChildModel: model => model.dragAndDrop,
  toParentMessage: message => GotDragAndDropMessage({ message }),
})

const subscriptions = Subscription.aggregate<Model, Message>()(
  dragAndDropSubscriptions,
  // ...your other subscription records
)

// Inside your view function, spread draggable() onto items and droppable()
// onto containers:
const view = (model: Model) => {
  const h = html<Message>()

  return h.ul(
    [
      ...Ui.DragAndDrop.droppable('list', 'Sortable items'),
      h.Class('flex flex-col gap-2'),
    ],
    model.items.map((item, index) =>
      h.li(
        [
          ...Ui.DragAndDrop.draggable({
            model: model.dragAndDrop,
            toParentMessage: message => GotDragAndDropMessage({ message }),
            itemId: item.id,
            containerId: 'list',
            index,
          }),
          h.Class('p-3 rounded-lg border cursor-grab'),
        ],
        [h.span([], [item.label])],
      ),
    ),
  )
}

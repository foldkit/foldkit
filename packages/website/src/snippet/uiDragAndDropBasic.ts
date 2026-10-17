// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit each into your own Model, init, Message,
// update, subscriptions, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { DragAndDrop } from '@foldkit/ui'
import {
  draggable as DragAndDropDraggable,
  droppable as DragAndDropDroppable,
} from '@foldkit/ui/dragAndDrop'

// Add a field to your Model for the DragAndDrop Block plus the items being sorted:
const Model = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({ id: Schema.String, label: Schema.String }),
  ),
  dragAndDrop: DragAndDrop.Model,
  // ...your other fields
})
type Model = typeof Model.Type

// Embed the DragAndDrop Message in your parent Message:
const Message = defineMessageUnion({
  GotDragAndDropMessage: { message: DragAndDrop.Message },
})
type Message = typeof Message.Type

declare const reorder: (
  items: Model['items'],
  itemId: string,
  fromIndex: number,
  toIndex: number,
) => Model['items']

// At module scope, fold the OutMessage into your own Model. `Reordered`
// carries the move so you can apply it to your own list. Each arm returns an
// Update.Step over the parent Model, which already has the next DragAndDrop
// Model written back:
const foldDragAndDropOutMessage = DragAndDrop.OutMessage.match<
  Update.Step<Model, Message>
>({
  Reordered:
    ({ itemId, fromIndex, toIndex }) =>
    model => ({
      model: modifyFields(model, {
        // reorder is your own function that moves the item
        items: items => reorder(items, itemId, fromIndex, toIndex),
      }),
    }),
  // The child has emitted `Cancelled`. In this arm the parent can update
  // its own state or dispatch its own Commands, for example revert an
  // optimistic UI change, log analytics, or trigger a downstream Command.
  Cancelled: () => model => ({ model }),
})

// The Binding delegates the child update, writes the next DragAndDrop Model,
// maps its Commands, handles OutMessages, and collects its Subscriptions.
const SortableList = Block.define('SortableList', {
  Model,
  Message,
})

const DragAndDropBinding = SortableList.bindChild(DragAndDrop.block, {
  field: 'dragAndDrop',
  parentMessage: Message.GotDragAndDropMessage,
  init: { args: () => Tuple.make({ id: 'sortable-list' }) },
  outMessage: { fold: foldDragAndDropOutMessage },
})

const SortableListComposition = SortableList.makeComposition({
  childBindings: [DragAndDropBinding],
})

// Initialize the fields the parent owns. The Composition initializes the
// bound DragAndDrop Model with the Binding's unique id.
const init = SortableListComposition.makeInit(() => ({
  model: {
    items: [
      { id: '1', label: 'First' },
      { id: '2', label: 'Second' },
      { id: '3', label: 'Third' },
    ],
    // ...your other fields
  },
}))

const update = SortableListComposition.makeUpdate()

// Registering `DragAndDropBinding` in `childBindings` collects its document-level Subscriptions.

// Inside your view function, spread draggable() onto items and droppable()
// onto containers:
const view = SortableListComposition.makeView((model, h) =>
  h.ul(
    [
      ...DragAndDropDroppable('list', 'Sortable items'),
      h.Class('flex flex-col gap-2'),
    ],
    model.items.map((item, index) =>
      h.li(
        [
          ...DragAndDropDraggable(
            {
              model: model.dragAndDrop,
              toParentMessage: message =>
                Message.GotDragAndDropMessage({ message }),
              itemId: item.id,
              containerId: 'list',
              index,
            },
            h,
          ),
          h.Class('p-3 rounded-lg border cursor-grab'),
        ],
        [h.span([], [item.label])],
      ),
    ),
  ),
)

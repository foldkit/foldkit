// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit each into your own Model, init, Message,
// update, subscriptions, and view definitions.
import { Array, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { DragAndDrop } from '@foldkit/ui'

// Add a field to your Model for the DragAndDrop Block plus the items being sorted:
const Model = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({ id: Schema.String, label: Schema.String }),
  ),
  dragAndDrop: DragAndDrop.DragAndDropBlock.Model,
  // ...your other fields
})

// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})

declare const reorder: (
  items: (typeof Model.Type)['items'],
  itemId: string,
  fromIndex: number,
  toIndex: number,
) => (typeof Model.Type)['items']

const SortableListDefinition = Block.makeDefinition('SortableList', {
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep } = SortableListDefinition

// At module scope, fold the OutMessage into your own Model. `Reordered`
// carries the move so you can apply it to your own list. Each arm returns an
// Update.Step over the parent Model, which already has the next DragAndDrop
// Model written back. The parent Definition checks the complete child union
// and infers each parent Step:
const foldDragAndDropOutMessage = SortableListDefinition.makeOutMessageFold(
  DragAndDrop.DragAndDropBlock,
  {
    Reordered: ({ itemId, fromIndex, toIndex }) =>
      makeFieldsStep(() => ({
        // reorder is your own function that moves the item
        items: items => reorder(items, itemId, fromIndex, toIndex),
      })),
    // The child has emitted `Cancelled`. In this arm the parent can update
    // its own state or dispatch its own Commands, for example revert an
    // optimistic UI change, log analytics, or trigger a downstream Command.
    StartedKeyboardDrag: makeNoopStep,
    ChangedKeyboardTarget: makeNoopStep,
    Cancelled: makeNoopStep,
  },
)

// The Binding delegates the child update, writes the next DragAndDrop Model,
// routes generated delivery, handles OutMessages, and collects Subscriptions.
const DragAndDropBinding = SortableListDefinition.makeBinding(
  DragAndDrop.DragAndDropBlock,
  {
    field: 'dragAndDrop',
    init: { contextToArgs: () => Tuple.make({ id: 'sortable-list' }) },
  },
).withOutMessagePolicy({ fold: foldDragAndDropOutMessage })

const SortableListComposition = SortableListDefinition.makeComposition({
  bindings: [DragAndDropBinding],
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

const update = SortableListComposition.makeUpdate({})

// Registering `DragAndDropBinding` in `bindings` collects its document-level Subscriptions.

// Inside your view function, embed the behavior-only Block and lay out its
// draggable and droppable attribute bundles in `toView`:
const view = SortableListComposition.makeView((model, h) =>
  h.block(
    DragAndDropBinding.embedView({
      slotId: 'sortable-list',
      model: model.dragAndDrop,
      viewInputs: {
        toView: ({ draggable, droppable }) =>
          h.ul(
            [
              ...droppable('list', 'Sortable items'),
              h.Class('flex flex-col gap-2'),
            ],
            Array.map(model.items, (item, index) =>
              h.li(
                [
                  ...draggable({
                    itemId: item.id,
                    containerId: 'list',
                    index,
                  }),
                  h.Class('p-3 rounded-lg border cursor-grab'),
                ],
                [h.span([], [item.label])],
              ),
            ),
          ),
      },
    }),
  ),
)

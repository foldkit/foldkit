// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit each into your own Model, init, Message,
// update, subscriptions, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Subscription, Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { DragAndDrop } from '@foldkit/ui'

// Add a field to your Model for the DragAndDrop Submodel plus the items being sorted:
const Model = S.Struct({
  items: S.Array(S.Struct({ id: S.String, label: S.String })),
  dragAndDrop: DragAndDrop.Model,
  // ...your other fields
})

// In your init function, initialize the DragAndDrop Submodel with a unique id:
const init = () => ({
  model: {
    items: [
      { id: '1', label: 'First' },
      { id: '2', label: 'Second' },
      { id: '3', label: 'Third' },
    ],
    dragAndDrop: DragAndDrop.init({ id: 'sortable-list' }),
    // ...your other fields
  },
})

// Embed the DragAndDrop Message in your parent Message:
const Message = defineMessageUnion({
  GotDragAndDropMessage: { message: DragAndDrop.Message },
})

// At module scope, fold the OutMessage into your own Model. `Reordered`
// carries the move so you can apply it to your own list. Each arm returns an
// Update.Step over the parent Model, which already has the next DragAndDrop
// Model written back:
const foldDragAndDropOutMessage = M.type<DragAndDrop.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Reordered:
      ({ itemId, fromIndex, toIndex }) =>
      model => ({
        model: evo(model, {
          // reorder is your own function that moves the item
          items: () => reorder(model.items, itemId, fromIndex, toIndex),
        }),
      }),
    // The child has emitted `Cancelled`. In this arm the parent can update
    // its own state or dispatch its own Commands, for example revert an
    // optimistic UI change, log analytics, or trigger a downstream Command.
    Cancelled: () => model => ({ model }),
  }),
)

// Update.foldChild wires the child into the parent: it runs
// DragAndDrop.update, writes the next DragAndDrop Model back, maps the
// Submodel's Commands into your Message type, and hands any OutMessage to
// foldOutMessage.
const foldDragAndDrop = Update.foldChild({
  update: DragAndDrop.update,
  read: (model: Model) => Option.some(model.dragAndDrop),
  write: (model, nextDragAndDrop) =>
    evo(model, { dragAndDrop: () => nextDragAndDrop }),
  toParentMessage: message => Message.GotDragAndDropMessage({ message }),
  foldOutMessage: foldDragAndDropOutMessage,
})

// Inside your update function's Message.match({...}), call the fold:
GotDragAndDropMessage: ({ message }) => foldDragAndDrop(model, message)

// In your subscriptions, lift all four document-level listeners through
// Subscription.lift in one shot:
const dragAndDropSubscriptions = Subscription.lift({
  dragPointer: DragAndDrop.subscriptions.documentPointer,
  dragEscape: DragAndDrop.subscriptions.documentEscape,
  dragKeyboard: DragAndDrop.subscriptions.documentKeyboard,
  autoScroll: DragAndDrop.subscriptions.autoScroll,
})<Model, Message>({
  toChildModel: model => model.dragAndDrop,
  toParentMessage: message => Message.GotDragAndDropMessage({ message }),
})

const subscriptions = Subscription.aggregate<Model, Message>()(
  dragAndDropSubscriptions,
  // ...your other subscription records
)

// Inside your view function, spread draggable() onto items and droppable()
// onto containers:
const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.ul(
    [
      ...DragAndDrop.droppable('list', 'Sortable items'),
      h.Class('flex flex-col gap-2'),
    ],
    model.items.map((item, index) =>
      h.li(
        [
          ...DragAndDrop.draggable(
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
  )

// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

// Add a field to your Model for the Dialog Block:
const Model = Schema.Struct({
  dialog: Dialog.DialogBlock.Model,
  // ...your other fields
})

// A fact for the trigger, plus the Dialog Message embedded in your parent
// Message for the block delegation:
const Message = defineMessageUnion({
  ClickedOpenDialog: {},
})

const DialogExampleDefinition = Block.makeDefinition('DialogExample', {
  Model,
  Message,
})

// One boundary handles Dialog Messages, Commands, and OutMessages. Replace
// either no-op arm with the parent transition that should follow that event.
const foldDialogOutMessage = DialogExampleDefinition.makeOutMessageFold(
  Dialog.DialogBlock,
  {
    Opened: DialogExampleDefinition.makeNoopStep,
    Closed: DialogExampleDefinition.makeNoopStep,
    CompletedClose: DialogExampleDefinition.makeNoopStep,
  },
)

const DialogBinding = DialogExampleDefinition.makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => Tuple.make({ id: 'confirm' }) },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

const DialogExampleComposition = DialogExampleDefinition.makeComposition({
  bindings: [DialogBinding],
})

// In your init function, initialize the Dialog Block with a unique id:
const init = DialogExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = DialogExampleComposition.makeUpdate({
  ClickedOpenDialog: DialogBinding.requestOpen(),
})

// In your view, open from a trigger with the fact, and dismiss from a Cancel
// button by spreading the `closeButton` bundle, no parent message needed:
const view = DialogExampleComposition.makeView((model, h) => {
  const dialogView = ({
    dialog,
    backdrop,
    panel,
    title,
    description,
    closeButton,
    isVisible,
  }: DialogRenderInfo) =>
    h.dialog(
      [...dialog],
      isVisible
        ? [
            h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')]),
            h.div(
              [...panel, h.Class('rounded-lg p-6 max-w-md mx-auto shadow-xl')],
              [
                h.h2([...title], ['Confirm Action']),
                h.p([...description], ['Are you sure you want to proceed?']),
                h.button(
                  [...closeButton, h.Class('px-4 py-2 rounded-lg border')],
                  ['Cancel'],
                ),
              ],
            ),
          ]
        : [],
    )

  return h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedOpenDialog())], ['Open Dialog']),
      h.block(
        DialogBinding.embedView({
          slotId: model.dialog.id,
          model: model.dialog,
          viewInputs: {
            hasDescription: true,
            toView: dialogView,
          },
        }),
      ),
    ],
  )
})

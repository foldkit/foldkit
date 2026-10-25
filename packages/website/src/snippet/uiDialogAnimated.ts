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

// This excerpt has no parent-owned facts. The Composition derives Dialog
// delivery; open from a trigger with `DialogBinding.requestOpen()` as in the
// basic Dialog example.
const Message = defineMessageUnion({})

const AnimatedDialogExampleDefinition = Block.makeDefinition(
  'AnimatedDialogExample',
  {
    Model,
    Message,
  },
)

const foldDialogOutMessage = AnimatedDialogExampleDefinition.makeOutMessageFold(
  Dialog.DialogBlock,
  {
    Opened: AnimatedDialogExampleDefinition.makeNoopStep,
    Closed: AnimatedDialogExampleDefinition.makeNoopStep,
    CompletedClose: AnimatedDialogExampleDefinition.makeNoopStep,
  },
)

const DialogBinding = AnimatedDialogExampleDefinition.makeBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: {
      contextToArgs: () => Tuple.make({ id: 'confirm', isAnimated: true }),
    },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

const AnimatedDialogExampleComposition =
  AnimatedDialogExampleDefinition.makeComposition({
    bindings: [DialogBinding],
  })

// In your init function, set isAnimated: true to coordinate CSS transitions:
const init = AnimatedDialogExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = AnimatedDialogExampleComposition.makeUpdate({})

// Inside your view function, use data-[closed] for enter/leave transitions and
// spread the `closeButton` bundle onto your dismiss buttons:
const view = AnimatedDialogExampleComposition.makeView((model, h) => {
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
      [
        ...dialog,
        h.Class('bg-transparent p-0 open:flex items-center justify-center'),
      ],
      isVisible
        ? [
            h.div([
              ...backdrop,
              h.Class(
                'fixed inset-0 bg-black/50 transition duration-150 ease-out data-[closed]:opacity-0',
              ),
            ]),
            h.div(
              [
                ...panel,
                h.Class(
                  'rounded-lg p-6 max-w-md mx-auto shadow-xl transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
                ),
              ],
              [
                h.h2([...title], ['Confirm Action']),
                h.p([...description], ['Are you sure you want to proceed?']),
                h.div(
                  [h.Class('flex gap-2 justify-end mt-4')],
                  [
                    h.button(
                      [...closeButton, h.Class('px-4 py-2 rounded-lg border')],
                      ['Cancel'],
                    ),
                    h.button(
                      [
                        ...closeButton,
                        h.Class('px-4 py-2 rounded-lg bg-blue-600 text-white'),
                      ],
                      ['Confirm'],
                    ),
                  ],
                ),
              ],
            ),
          ]
        : [],
    )

  return h.block(
    DialogBinding.embedView({
      slotId: model.dialog.id,
      model: model.dialog,
      viewInputs: {
        hasDescription: true,
        toView: dialogView,
      },
    }),
  )
})

// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Command } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

// Add a field to your Model for the Dialog Submodel:
const Model = S.Struct({
  dialog: Dialog.Model,
  // ...your other fields
})

// In your init function, set isAnimated: true to coordinate CSS transitions:
const init = () => ({
  model: {
    dialog: Dialog.init({ id: 'confirm', isAnimated: true }),
    // ...your other fields
  },
})

// Embed the Dialog Message in your parent Message and delegate to
// Dialog.update (open from a trigger with a fact and Dialog.open, as in
// the basic Dialog example):
const Message = defineMessageUnion({
  GotDialogMessage: { message: Dialog.Message },
})

GotDialogMessage: ({ message }) => {
  const dialogUpdate = Dialog.update(model.dialog, message)
  return {
    model: evo(model, { dialog: () => dialogUpdate.model }),
    commands: Command.mapMessages(dialogUpdate.commands ?? [], message =>
      Message.GotDialogMessage({ message }),
    ),
  }
}

// Inside your view function, use data-[closed] for enter/leave transitions and
// spread the `closeButton` bundle onto your dismiss buttons:
const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: model.dialog.id,
    model: model.dialog,
    view: Dialog.view,
    viewInputs: {
      toView: ({
        dialog,
        backdrop,
        panel,
        title,
        description,
        closeButton,
        isVisible,
      }) =>
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
                    h.p(
                      [...description],
                      ['Are you sure you want to proceed?'],
                    ),
                    h.div(
                      [h.Class('flex gap-2 justify-end mt-4')],
                      [
                        h.button(
                          [
                            ...closeButton,
                            h.Class('px-4 py-2 rounded-lg border'),
                          ],
                          ['Cancel'],
                        ),
                        h.button(
                          [
                            ...closeButton,
                            h.Class(
                              'px-4 py-2 rounded-lg bg-blue-600 text-white',
                            ),
                          ],
                          ['Confirm'],
                        ),
                      ],
                    ),
                  ],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => Message.GotDialogMessage({ message }),
  })

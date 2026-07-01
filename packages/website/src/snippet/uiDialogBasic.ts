// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Command } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

// Add a field to your Model for the Dialog Submodel:
const Model = S.Struct({
  dialog: Dialog.Model,
  // ...your other fields
})

// In your init function, initialize the Dialog Submodel with a unique id:
const init = () => [
  {
    dialog: Dialog.init({ id: 'confirm' }),
    // ...your other fields
  },
  [],
]

// A fact for the trigger, plus the Dialog Message embedded in your parent
// Message for the submodel delegation:
const ClickedOpenDialog = m('ClickedOpenDialog')
const GotDialogMessage = m('GotDialogMessage', {
  message: Dialog.Message,
})

// Open the dialog from your update with Dialog.open. Escape, the backdrop,
// and the closeButton bundle all flow back through GotDialogMessage, where you
// delegate to Dialog.update. (Both return an Option<OutMessage> as the
// third element; match Opened/Closed there to react to the transitions.)
ClickedOpenDialog: () => {
  const [nextDialog, dialogCommands] = Dialog.open(model.dialog)
  return [
    evo(model, { dialog: () => nextDialog }),
    Command.mapMessages(dialogCommands, message =>
      GotDialogMessage({ message }),
    ),
  ]
}

GotDialogMessage: ({ message }) => {
  const [nextDialog, dialogCommands] = Dialog.update(model.dialog, message)
  return [
    evo(model, { dialog: () => nextDialog }),
    Command.mapMessages(dialogCommands, message =>
      GotDialogMessage({ message }),
    ),
  ]
}

// In your view, open from a trigger with the fact, and dismiss from a Cancel
// button by spreading the `closeButton` bundle, no parent message needed:
const view = () => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.button([h.OnClick(ClickedOpenDialog())], ['Open Dialog']),
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
              [...dialog],
              isVisible
                ? [
                    h.div(
                      [...backdrop, h.Class('fixed inset-0 bg-black/50')],
                      [],
                    ),
                    h.div(
                      [
                        ...panel,
                        h.Class('rounded-lg p-6 max-w-md mx-auto shadow-xl'),
                      ],
                      [
                        h.h2([...title], ['Confirm Action']),
                        h.p(
                          [...description],
                          ['Are you sure you want to proceed?'],
                        ),
                        h.button(
                          [
                            ...closeButton,
                            h.Class('px-4 py-2 rounded-lg border'),
                          ],
                          ['Cancel'],
                        ),
                      ],
                    ),
                  ]
                : [],
            ),
        },
        toParentMessage: message => GotDialogMessage({ message }),
      }),
    ],
  )
}

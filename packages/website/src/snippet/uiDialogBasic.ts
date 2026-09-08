// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

// Add a field to your Model for the Dialog Submodel:
const Model = Schema.Struct({
  dialog: Dialog.Model,
  // ...your other fields
})
type Model = typeof Model.Type

// In your init function, initialize the Dialog Submodel with a unique id:
const init = () => ({
  model: {
    dialog: Dialog.init({ id: 'confirm' }),
    // ...your other fields
  },
})

// A fact for the trigger, plus the Dialog Message embedded in your parent
// Message for the submodel delegation:
const Message = defineMessageUnion({
  ClickedOpenDialog: {},
  GotDialogMessage: { message: Dialog.Message },
})
type Message = typeof Message.Type

// One boundary handles Dialog Messages, Commands, and OutMessages. Replace
// either no-op arm with the parent transition that should follow that event.
const foldDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const readDialog = (model: Model) => Option.some(model.dialog)
const writeDialog = (model: Model, dialog: Dialog.Model): Model =>
  evo(model, { dialog: () => dialog })
const toGotDialogMessage = (message: Dialog.Message): Message =>
  Message.GotDialogMessage({ message })

const foldDialog = Update.foldChild({
  update: Dialog.update,
  read: readDialog,
  write: writeDialog,
  toParentMessage: toGotDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})

const foldDialogOpen = Update.foldChildStep({
  update: Dialog.open,
  read: readDialog,
  write: writeDialog,
  toParentMessage: toGotDialogMessage,
  foldOutMessage: foldDialogOutMessage,
})

// In the corresponding Message.match handler:
ClickedOpenDialog: () => foldDialogOpen(model)
GotDialogMessage: ({ message }) => foldDialog(model, message)

// In your view, open from a trigger with the fact, and dismiss from a Cancel
// button by spreading the `closeButton` bundle, no parent message needed:
const view = (h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedOpenDialog())], ['Open Dialog']),
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
                    h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')]),
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
        toParentMessage: message => Message.GotDialogMessage({ message }),
      }),
    ],
  )

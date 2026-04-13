// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Id, OnClick, button, div, h2, p } from './html'

// Add a field to your Model for the Dialog Submodel:
const Model = S.Struct({
  dialog: Ui.Dialog.Model,
  // ...your other fields
})

// In your init function, initialize the Dialog Submodel with a unique id:
const init = () => [
  {
    dialog: Ui.Dialog.init({ id: 'confirm' }),
    // ...your other fields
  },
  [],
]

// Embed the Dialog Message in your parent Message:
const GotDialogMessage = m('GotDialogMessage', {
  message: Ui.Dialog.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to Dialog.update:
GotDialogMessage: ({ message }) => {
  const [nextDialog, commands] = Ui.Dialog.update(model.dialog, message)

  return [
    // Merge the next state into your Model:
    evo(model, { dialog: () => nextDialog }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(Effect.map(message => GotDialogMessage({ message }))),
    ),
  ]
}

// Helper to convert Dialog Messages to your parent Message:
const dialogToParentMessage = (message: Ui.Dialog.Message): Message =>
  GotDialogMessage({ message })

// Inside your view function, open the dialog by dispatching Ui.Dialog.Opened():
button([OnClick(dialogToParentMessage(Ui.Dialog.Opened()))], ['Open Dialog'])

// And render the dialog — backed by native <dialog> with showModal():
Ui.Dialog.view({
  model: model.dialog,
  toParentMessage: dialogToParentMessage,
  backdropAttributes: [Class('fixed inset-0 bg-black/50')],
  panelContent: div(
    [],
    [
      h2([Id(Ui.Dialog.titleId(model.dialog))], ['Confirm Action']),
      p([], ['Are you sure you want to proceed?']),
      button(
        [
          OnClick(dialogToParentMessage(Ui.Dialog.Closed())),
          Class('px-4 py-2 rounded-lg border'),
        ],
        ['Close'],
      ),
    ],
  ),
  panelAttributes: [Class('rounded-lg p-6 max-w-md mx-auto shadow-xl')],
})

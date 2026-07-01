// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Command } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Dialog } from '@foldkit/ui'

// One Model field per dialog level:
const Model = S.Struct({
  settingsDialog: Dialog.Model,
  confirmDialog: Dialog.Model,
  // ...your other fields
})

const init = () => [
  {
    settingsDialog: Dialog.init({ id: 'settings' }),
    confirmDialog: Dialog.init({ id: 'confirm-delete' }),
    // ...your other fields
  },
  [],
]

// Embed each Dialog Message in your parent Message and delegate each to its
// own Dialog.update (see the basic Dialog example for the delegation).
const GotSettingsDialogMessage = m('GotSettingsDialogMessage', {
  message: Dialog.Message,
})
const GotConfirmDialogMessage = m('GotConfirmDialogMessage', {
  message: Dialog.Message,
})

// Opening the confirmation is a parent fact, not a hand-wrapped child message.
// The button dispatches ClickedDeleteProject; the update opens the confirmation
// through Dialog.open, keeping Got* for genuine child results.
const ClickedDeleteProject = m('ClickedDeleteProject')
const ConfirmedDeleteProject = m('ConfirmedDeleteProject')

// ...in your update's M.tagsExhaustive({...}):
ClickedDeleteProject: () => {
  const [nextConfirmDialog, confirmDialogCommands] = Dialog.open(
    model.confirmDialog,
  )
  return [
    evo(model, { confirmDialog: () => nextConfirmDialog }),
    Command.mapMessages(confirmDialogCommands, message =>
      GotConfirmDialogMessage({ message }),
    ),
  ]
}

// Confirming runs the deletion, then closes the confirmation through
// Dialog.close, the same API the opening fact used.
ConfirmedDeleteProject: () => {
  // ...run the deletion here, then:
  const [nextConfirmDialog, confirmDialogCommands] = Dialog.close(
    model.confirmDialog,
  )
  return [
    evo(model, { confirmDialog: () => nextConfirmDialog }),
    Command.mapMessages(confirmDialogCommands, message =>
      GotConfirmDialogMessage({ message }),
    ),
  ]
}

// Each dialog is its own submodel; the framework stacks them by z-index, traps
// focus in the topmost, and Escape closes the topmost before the one beneath
// it. Cancel dismisses the confirmation by spreading the `closeButton` bundle; Delete
// dispatches a fact that runs the work and closes through Dialog.close.
const view = () => {
  const h = html<Message>()

  const confirmDialog = h.submodel({
    slotId: model.confirmDialog.id,
    model: model.confirmDialog,
    view: Dialog.view,
    viewInputs: {
      toView: ({ dialog, backdrop, panel, title, closeButton, isVisible }) =>
        h.dialog(
          [...dialog],
          isVisible
            ? [
                h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')], []),
                h.div(
                  [
                    ...panel,
                    h.Class('rounded-lg p-6 max-w-sm mx-auto shadow-xl'),
                  ],
                  [
                    h.h2([...title], ['Delete project?']),
                    h.button([...closeButton], ['Cancel']),
                    h.button([h.OnClick(ConfirmedDeleteProject())], ['Delete']),
                  ],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => GotConfirmDialogMessage({ message }),
  })

  const settingsDialog = h.submodel({
    slotId: model.settingsDialog.id,
    model: model.settingsDialog,
    view: Dialog.view,
    viewInputs: {
      toView: ({ dialog, backdrop, panel, title, isVisible }) =>
        h.dialog(
          [...dialog],
          isVisible
            ? [
                h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')], []),
                h.div(
                  [
                    ...panel,
                    h.Class('rounded-lg p-6 max-w-lg mx-auto shadow-xl'),
                  ],
                  [
                    h.h2([...title], ['Project settings']),
                    h.button(
                      [h.OnClick(ClickedDeleteProject())],
                      ['Delete project'],
                    ),
                  ],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => GotSettingsDialogMessage({ message }),
  })

  return h.div([], [settingsDialog, confirmDialog])
}

import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, Id, OnClick, button, div, h2, p } from './html'

// Submodel wiring:
//   Model field: dialog: Ui.Dialog.Model
//   Init: Ui.Dialog.init({ id: 'confirm' })
//   Update: delegate via Ui.Dialog.update

const GotDialogMessage = m('GotDialogMessage', {
  message: Ui.Dialog.Message,
})

// Open the dialog by dispatching Ui.Dialog.Opened()
button(
  [OnClick(toParentMessage(GotDialogMessage({ message: Ui.Dialog.Opened() })))],
  ['Open Dialog'],
)

// The dialog view — backed by native <dialog> with showModal()
Ui.Dialog.view({
  model: model.dialog,
  toParentMessage: message => GotDialogMessage({ message }),
  backdropAttributes: [Class('fixed inset-0 bg-black/50')],
  panelContent: div(
    [],
    [
      h2([Id(Ui.Dialog.titleId(model.dialog))], ['Confirm Action']),
      p([], ['Are you sure you want to proceed?']),
      button(
        [
          OnClick(
            toParentMessage(GotDialogMessage({ message: Ui.Dialog.Closed() })),
          ),
        ],
        ['Close'],
      ),
    ],
  ),
  panelAttributes: [Class('rounded-lg p-6 max-w-md mx-auto shadow-xl')],
})

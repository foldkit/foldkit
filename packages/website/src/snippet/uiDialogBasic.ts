import { Effect, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Id, OnClick, button, div, h2, p } from './html'

// MODEL

const Model = S.Struct({
  dialog: Ui.Dialog.Model,
})

// INIT

const init = () => [{ dialog: Ui.Dialog.init({ id: 'confirm' }) }, []]

// MESSAGE

const GotDialogMessage = m('GotDialogMessage', {
  message: Ui.Dialog.Message,
})

// UPDATE

GotDialogMessage: ({ message }) => {
  const [nextDialog, commands] = Ui.Dialog.update(model.dialog, message)

  return [
    evo(model, { dialog: () => nextDialog }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotDialogMessage({ message }))),
    ),
  ]
}

// VIEW

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

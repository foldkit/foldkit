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

const Message = S.Union(GotDialogMessage)
type Message = typeof Message.Type

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

const dialogToParentMessage = (message: Ui.Dialog.Message): Message =>
  GotDialogMessage({ message })

// Open the dialog by dispatching Ui.Dialog.Opened()
button([OnClick(dialogToParentMessage(Ui.Dialog.Opened()))], ['Open Dialog'])

// The dialog view — backed by native <dialog> with showModal()
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

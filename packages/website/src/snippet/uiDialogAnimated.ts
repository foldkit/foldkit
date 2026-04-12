import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, Id, OnClick, button, div, h2, p } from './html'

// Your Model has a field for the Dialog Submodel:
const Model = S.Struct({
  dialog: Ui.Dialog.Model,
  // ...your other fields
})

// Initialize with isAnimated: true for CSS transition coordination:
const initialModel = {
  dialog: Ui.Dialog.init({ id: 'confirm', isAnimated: true }),
}

// Wrap the Dialog Message in your parent Message:
const GotDialogMessage = m('GotDialogMessage', {
  message: Ui.Dialog.Message,
})

// In your update, delegate to Dialog.update:
GotDialogMessage: ({ message }) => {
  const [nextDialog, commands] = Ui.Dialog.update(model.dialog, message)

  return [
    evo(model, { dialog: () => nextDialog }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotDialogMessage({ message }))),
    ),
  ]
}

// In your view, use data-[closed] for enter/leave transitions:
const dialogToParentMessage = (message: Ui.Dialog.Message): Message =>
  GotDialogMessage({ message })

Ui.Dialog.view({
  model: model.dialog,
  toParentMessage: dialogToParentMessage,
  backdropAttributes: [
    Class(
      'fixed inset-0 bg-black/50 transition duration-150 ease-out data-[closed]:opacity-0',
    ),
  ],
  panelContent: div(
    [],
    [
      h2([Id(Ui.Dialog.titleId(model.dialog))], ['Confirm Action']),
      p([], ['Are you sure you want to proceed?']),
      div(
        [Class('flex gap-2 justify-end mt-4')],
        [
          button(
            [
              OnClick(dialogToParentMessage(Ui.Dialog.Closed())),
              Class('px-4 py-2 rounded-lg border'),
            ],
            ['Cancel'],
          ),
          button(
            [
              OnClick(dialogToParentMessage(Ui.Dialog.Closed())),
              Class('px-4 py-2 rounded-lg bg-blue-600 text-white'),
            ],
            ['Confirm'],
          ),
        ],
      ),
    ],
  ),
  panelAttributes: [
    Class(
      'rounded-lg p-6 max-w-md mx-auto shadow-xl transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
    ),
  ],
  attributes: [
    Class(
      'backdrop:bg-transparent bg-transparent p-0 open:flex items-center justify-center',
    ),
  ],
})

import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, Id, OnClick, button, div, h2, p } from './html'

const GotDialogMessage = m('GotDialogMessage', {
  message: Ui.Dialog.Message,
})

// Init with isAnimated: true to coordinate CSS transitions
//   dialog: Ui.Dialog.init({ id: 'confirm', isAnimated: true })

Ui.Dialog.view({
  model: model.dialog,
  toParentMessage: message => GotDialogMessage({ message }),
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
              OnClick(
                toParentMessage(
                  GotDialogMessage({ message: Ui.Dialog.Closed() }),
                ),
              ),
              Class('px-4 py-2 rounded-lg border'),
            ],
            ['Cancel'],
          ),
          button(
            [
              OnClick(
                toParentMessage(
                  GotDialogMessage({ message: Ui.Dialog.Closed() }),
                ),
              ),
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

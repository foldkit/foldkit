import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, h3, p, span } from './html'

// Submodel wiring:
//   Model field: popover: Ui.Popover.Model
//   Init: Ui.Popover.init({ id: 'info' })
//   Update: delegate via Ui.Popover.update

const GotPopoverMessage = m('GotPopoverMessage', {
  message: Ui.Popover.Message,
})

Ui.Popover.view({
  model: model.popover,
  toParentMessage: message => GotPopoverMessage({ message }),
  buttonContent: span([], ['Solutions']),
  buttonClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
  panelContent: div(
    [],
    [
      h3([Class('font-medium')], ['Analytics']),
      p(
        [Class('text-sm text-gray-500')],
        ['Get a better understanding of where your traffic is coming from.'],
      ),
    ],
  ),
  panelClassName: 'rounded-lg border shadow-lg p-4 w-80',
  backdropClassName: 'fixed inset-0',
  anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
})

import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, h3, p, span } from './html'

// Add a field to your Model for the Popover Submodel:
const Model = S.Struct({
  popover: Ui.Popover.Model,
  // ...your other fields
})

// Initialize it with a unique id:
const initialModel = {
  popover: Ui.Popover.init({ id: 'info' }),
}

// Embed the Popover Message in your parent Message:
const GotPopoverMessage = m('GotPopoverMessage', {
  message: Ui.Popover.Message,
})

// In your update, delegate to Popover.update:
GotPopoverMessage: ({ message }) => {
  const [nextPopover, commands] = Ui.Popover.update(model.popover, message)

  return [
    evo(model, { popover: () => nextPopover }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotPopoverMessage({ message }))),
    ),
  ]
}

// In your view:
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

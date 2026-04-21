// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, span } from './html'

// Add a field to your Model for the Tooltip Submodel:
const Model = S.Struct({
  tooltip: Ui.Tooltip.Model,
  // ...your other fields
})

// In your init function, initialize the Tooltip Submodel with a unique id:
const init = () => [
  {
    tooltip: Ui.Tooltip.init({ id: 'save-button' }),
    // ...your other fields
  },
  [],
]

// Embed the Tooltip Message in your parent Message:
const GotTooltipMessage = m('GotTooltipMessage', {
  message: Ui.Tooltip.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to Tooltip.update:
GotTooltipMessage: ({ message }) => {
  const [nextTooltip, commands] = Ui.Tooltip.update(model.tooltip, message)

  return [
    // Merge the next state into your Model:
    evo(model, { tooltip: () => nextTooltip }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(Effect.map(message => GotTooltipMessage({ message }))),
    ),
  ]
}

// Inside your view function, render the tooltip:
Ui.Tooltip.view({
  model: model.tooltip,
  toParentMessage: message => GotTooltipMessage({ message }),
  anchor: { placement: 'top', gap: 6, padding: 8 },
  triggerContent: span([], ['Save']),
  triggerClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
  content: span([], ['Save your changes (⌘S)']),
  panelClassName:
    'rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white shadow-lg',
})

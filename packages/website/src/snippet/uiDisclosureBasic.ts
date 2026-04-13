// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { p, span } from './html'

// Add a field to your Model for the Disclosure Submodel:
const Model = S.Struct({
  disclosure: Ui.Disclosure.Model,
  // ...your other fields
})

// In your init function, initialize the Disclosure Submodel with a unique id:
const init = () => [
  {
    disclosure: Ui.Disclosure.init({ id: 'faq-1' }),
    // ...your other fields
  },
  [],
]

// Embed the Disclosure Message in your parent Message:
const GotDisclosureMessage = m('GotDisclosureMessage', {
  message: Ui.Disclosure.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to Disclosure.update:
GotDisclosureMessage: ({ message }) => {
  const [nextDisclosure, commands] = Ui.Disclosure.update(
    model.disclosure,
    message,
  )

  return [
    // Merge the next state into your Model:
    evo(model, { disclosure: () => nextDisclosure }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotDisclosureMessage({ message })),
      ),
    ),
  ]
}

// Inside your view function, render the disclosure:
Ui.Disclosure.view({
  model: model.disclosure,
  toParentMessage: message => GotDisclosureMessage({ message }),
  buttonContent: span([], ['What is Foldkit?']),
  panelContent: p([], ['A functional UI framework built on Effect-TS.']),
  buttonClassName:
    'flex items-center justify-between w-full p-4 border rounded-lg data-[open]:rounded-b-none',
  panelClassName: 'p-4 border-x border-b rounded-b-lg',
})

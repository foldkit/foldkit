// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, button, div, label, p } from './html'

// Add a field to your Model for the Checkbox Submodel:
const Model = S.Struct({
  checkboxDemo: Ui.Checkbox.Model,
  // ...your other fields
})

// In your init function, initialize the Checkbox Submodel with a unique id:
const init = () => [
  {
    checkboxDemo: Ui.Checkbox.init({ id: 'terms' }),
    // ...your other fields
  },
  [],
]

// Embed the Checkbox Message in your parent Message:
const GotCheckboxMessage = m('GotCheckboxMessage', {
  message: Ui.Checkbox.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to Checkbox.update:
GotCheckboxMessage: ({ message }) => {
  const [nextCheckbox, commands] = Ui.Checkbox.update(
    model.checkboxDemo,
    message,
  )

  return [
    // Merge the next state into your Model:
    evo(model, { checkboxDemo: () => nextCheckbox }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(Effect.map(message => GotCheckboxMessage({ message }))),
    ),
  ]
}

// Inside your view function, render the checkbox:
Ui.Checkbox.view({
  model: model.checkboxDemo,
  toParentMessage: message => GotCheckboxMessage({ message }),
  toView: attributes =>
    div(
      [Class('flex flex-col gap-1')],
      [
        div(
          [Class('flex items-center gap-2')],
          [
            button(
              [...attributes.checkbox, Class('h-5 w-5 rounded border')],
              model.checkboxDemo.isChecked ? ['✓'] : [],
            ),
            label(
              [...attributes.label, Class('text-sm')],
              ['Accept terms and conditions'],
            ),
          ],
        ),
        p(
          [...attributes.description, Class('text-sm text-gray-500')],
          ['You agree to our Terms of Service.'],
        ),
      ],
    ),
})

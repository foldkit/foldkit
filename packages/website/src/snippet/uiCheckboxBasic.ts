// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

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

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Ui.Checkbox.update. The OutMessage's `ToggledChecked` carries the new
// `isChecked` value — use it to fire analytics, validate a form, or push
// the value to a backend at the toggle moment.
GotCheckboxMessage: ({ message }) => {
  const [nextCheckbox, commands, maybeOut] = Ui.Checkbox.update(
    model.checkboxDemo,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotCheckboxMessage({ message }),
  )

  return Option.match(maybeOut, {
    onNone: () => [
      evo(model, { checkboxDemo: () => nextCheckbox }),
      mappedCommands,
    ],
    onSome: M.type<typeof Ui.Checkbox.OutMessage.Type>().pipe(
      M.tagsExhaustive({
        ToggledChecked: ({ isChecked }) => {
          // React to the toggle — e.g. dispatch a Command, validate a
          // form, save a preference. Returning the next model + mapped
          // commands keeps the checkbox in sync; add your own commands
          // as needed.
          return [
            evo(model, { checkboxDemo: () => nextCheckbox }),
            mappedCommands,
          ]
        },
      }),
    ),
  })
}

// Inside your view function, render the checkbox via h.submodel:
const view = () => {
  const h = html<Message>()

  return h.submodel({
    id: 'terms-checkbox',
    view: Ui.Checkbox.view,
    model: model.checkboxDemo,
    inputs: {
      toView: attributes =>
        h.div(
          [h.Class('flex flex-col gap-1')],
          [
            h.div(
              [h.Class('flex items-center gap-2')],
              [
                h.button(
                  [...attributes.checkbox, h.Class('h-5 w-5 rounded border')],
                  model.checkboxDemo.isChecked ? ['✓'] : [],
                ),
                h.label(
                  [...attributes.label, h.Class('text-sm')],
                  ['Accept terms and conditions'],
                ),
              ],
            ),
            h.p(
              [...attributes.description, h.Class('text-sm text-gray-500')],
              ['You agree to our Terms of Service.'],
            ),
          ],
        ),
    },
    toParentMessage: message => GotCheckboxMessage({ message }),
  })
}

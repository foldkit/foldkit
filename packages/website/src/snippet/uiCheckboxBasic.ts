import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, button, div, label, p } from './html'

// MODEL — embed Checkbox.Model as a Submodel field
//   checkboxDemo: Ui.Checkbox.Model

// INIT
//   checkboxDemo: Ui.Checkbox.init({ id: 'terms' })

// MESSAGE — embed the Checkbox Message in your parent Message

const GotCheckboxMessage = m('GotCheckboxMessage', {
  message: Ui.Checkbox.Message,
})

// UPDATE — delegate to Checkbox.update

GotCheckboxMessage: ({ message }) => {
  const [nextCheckbox, commands] = Ui.Checkbox.update(
    model.checkboxDemo,
    message,
  )

  return [
    evo(model, { checkboxDemo: () => nextCheckbox }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotCheckboxMessage({ message }))),
    ),
  ]
}

// VIEW

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

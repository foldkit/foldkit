// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Array } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, button, div, label } from './html'

// Add multiple Checkbox Submodels to your Model for the parent and children:
const Model = S.Struct({
  optionA: Ui.Checkbox.Model,
  optionB: Ui.Checkbox.Model,
  // ...your other fields
})

// In your init function, initialize each Submodel:
const init = () => [
  {
    optionA: Ui.Checkbox.init({ id: 'option-a' }),
    optionB: Ui.Checkbox.init({ id: 'option-b' }),
    // ...your other fields
  },
  [],
]

// Embed each child's Message, plus a Message for the "Select All" parent:
const GotSelectAllMessage = m('GotSelectAllMessage', {
  message: Ui.Checkbox.Message,
})
const GotOptionAMessage = m('GotOptionAMessage', {
  message: Ui.Checkbox.Message,
})
const GotOptionBMessage = m('GotOptionBMessage', {
  message: Ui.Checkbox.Message,
})

// Inside your update function's M.tagsExhaustive({...}), toggling
// "Select All" sets all children to the same state:
GotSelectAllMessage: () => {
  const isAllChecked = Array.every(
    [model.optionA, model.optionB],
    ({ isChecked }) => isChecked,
  )
  const nextChecked = !isAllChecked

  return [
    evo(model, {
      optionA: () => evo(model.optionA, { isChecked: () => nextChecked }),
      optionB: () => evo(model.optionB, { isChecked: () => nextChecked }),
    }),
    [],
  ]
}

// Compute the parent's indeterminate state from the child checkboxes:
const checkboxes = [model.optionA, model.optionB]
const isAllChecked = Array.every(checkboxes, ({ isChecked }) => isChecked)
const isIndeterminate =
  !isAllChecked && Array.some(checkboxes, ({ isChecked }) => isChecked)

// Inside your view function, pass isIndeterminate to the parent checkbox:
Ui.Checkbox.view({
  model: { id: 'select-all', isChecked: isAllChecked },
  isIndeterminate,
  toParentMessage: message => GotSelectAllMessage({ message }),
  toView: attributes =>
    div(
      [Class('flex items-center gap-2')],
      [
        button(
          [...attributes.checkbox, Class('h-5 w-5 rounded border')],
          isIndeterminate ? ['—'] : isAllChecked ? ['✓'] : [],
        ),
        label([...attributes.label, Class('text-sm')], ['All notifications']),
      ],
    ),
})

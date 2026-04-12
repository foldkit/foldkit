import { Array } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, button, div, label } from './html'

// Your Model has multiple checkbox Submodels for parent + children:
const Model = S.Struct({
  optionA: Ui.Checkbox.Model,
  optionB: Ui.Checkbox.Model,
  // ...your other fields
})

// Initialize each one:
const initialModel = {
  optionA: Ui.Checkbox.init({ id: 'option-a' }),
  optionB: Ui.Checkbox.init({ id: 'option-b' }),
}

// Wrap each child's Message, plus a Message for the "Select All" parent:
const GotSelectAllMessage = m('GotSelectAllMessage', {
  message: Ui.Checkbox.Message,
})
const GotOptionAMessage = m('GotOptionAMessage', {
  message: Ui.Checkbox.Message,
})
const GotOptionBMessage = m('GotOptionBMessage', {
  message: Ui.Checkbox.Message,
})

// Toggling "Select All" sets all children to the same state:
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

// In your view, compute indeterminate from child states:
const childModels = [model.optionA, model.optionB]
const isAllChecked = Array.every(childModels, ({ isChecked }) => isChecked)
const isIndeterminate =
  !isAllChecked && Array.some(childModels, ({ isChecked }) => isChecked)

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

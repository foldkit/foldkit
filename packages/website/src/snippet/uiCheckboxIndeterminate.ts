import { Array } from 'effect'
import { Ui } from 'foldkit'

import { Class, button, div, label } from './html'

// Compute indeterminate from child checkbox states:
const childModels = [model.optionA, model.optionB]
const isAllChecked = Array.every(childModels, ({ isChecked }) => isChecked)
const isNoneChecked = !Array.some(childModels, ({ isChecked }) => isChecked)
const isIndeterminate = !isAllChecked && !isNoneChecked

// The parent "Select All" checkbox:
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

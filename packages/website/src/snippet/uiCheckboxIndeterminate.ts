// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Checkbox } from '@foldkit/ui'

// Store each child's checked state as a plain boolean field in your Model:
const Model = S.Struct({
  optionA: S.Boolean,
  optionB: S.Boolean,
  // ...your other fields
})

// In your init function, start each unchecked:
const init = () => [
  {
    optionA: false,
    optionB: false,
    // ...your other fields
  },
  [],
]

// One Message per child, plus one for the "Select All" parent. Each carries
// the new checked state:
const ToggledSelectAll = m('ToggledSelectAll', { isChecked: S.Boolean })
const ToggledOptionA = m('ToggledOptionA', { isChecked: S.Boolean })
const ToggledOptionB = m('ToggledOptionB', { isChecked: S.Boolean })

const Message = S.Union([ToggledSelectAll, ToggledOptionA, ToggledOptionB])

// Inside your update function's M.tagsExhaustive({...}), toggling "Select All"
// writes the same value to every child:
ToggledSelectAll: ({ isChecked }) => [
  evo(model, {
    optionA: () => isChecked,
    optionB: () => isChecked,
  }),
  [],
]

// Inside your view function, compute the parent's checked and indeterminate
// state from the children and pass isIndeterminate straight to Checkbox.view:
const view = model => {
  const h = html<Message>()

  const isAllChecked = model.optionA && model.optionB
  const isNoneChecked = !model.optionA && !model.optionB
  const isIndeterminate = !isAllChecked && !isNoneChecked

  const resolveSelectAllMark = () => {
    if (isIndeterminate) {
      return ['—']
    } else if (isAllChecked) {
      return ['✓']
    } else {
      return []
    }
  }

  return Checkbox.view<Message>({
    id: 'select-all',
    isChecked: isAllChecked,
    isIndeterminate,
    onToggle: isChecked => ToggledSelectAll({ isChecked }),
    toView: attributes =>
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.button(
            [...attributes.checkbox, h.Class('h-5 w-5 rounded border')],
            resolveSelectAllMark(),
          ),
          h.label(
            [...attributes.label, h.Class('text-sm')],
            ['All notifications'],
          ),
        ],
      ),
  })
}

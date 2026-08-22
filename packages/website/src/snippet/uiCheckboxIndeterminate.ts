// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Checkbox } from '@foldkit/ui'

// Store each child's checked state as a plain boolean field in your Model:
const Model = S.Struct({
  optionA: S.Boolean,
  optionB: S.Boolean,
  // ...your other fields
})

// In your init function, start each unchecked:
const init = () => ({
  model: {
    optionA: false,
    optionB: false,
    // ...your other fields
  },
})

// One Message per child, plus one for the "Select All" parent. Each carries
// the new checked state:

const Message = defineMessageUnion({
  ToggledSelectAll: { isChecked: S.Boolean },
  ToggledOptionA: { isChecked: S.Boolean },
  ToggledOptionB: { isChecked: S.Boolean },
})

// Inside your update function's Message.match({...}), toggling "Select All"
// writes the same value to every child:
ToggledSelectAll: ({ isChecked }) => ({
  model: evo(model, {
    optionA: () => isChecked,
    optionB: () => isChecked,
  }),
})

// Inside your view function, compute the parent's checked and indeterminate
// state from the children and pass isIndeterminate straight to Checkbox.view:
const view = (model, h: HtmlBuilder<Message>) => {
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

  return Checkbox.view(
    {
      id: 'select-all',
      isChecked: isAllChecked,
      isIndeterminate,
      onToggle: isChecked => Message.ToggledSelectAll({ isChecked }),
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
    },
    h,
  )
}

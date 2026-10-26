// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Checkbox } from '@foldkit/ui'

// Store each child's checked state as a plain boolean field in your Model:
const Model = Schema.Struct({
  optionA: Schema.Boolean,
  optionB: Schema.Boolean,
  // ...your other fields
})

// One Message per child, plus one for the "Select All" parent. Each carries
// the new checked state:

const Message = defineMessageUnion({
  ToggledSelectAll: { isChecked: Schema.Boolean },
  ToggledOptionA: { isChecked: Schema.Boolean },
  ToggledOptionB: { isChecked: Schema.Boolean },
})

const NotificationPreferencesComposition = Block.makeDefinition(
  'NotificationPreferences',
  {
    Model,
    Message,
  },
).makeComposition()

// In your init function, start each unchecked:
const init = NotificationPreferencesComposition.makeInit(() => ({
  model: {
    optionA: false,
    optionB: false,
    // ...your other fields
  },
}))

// In the corresponding update handler, toggling "Select All"
// writes the same value to every child:
const update = NotificationPreferencesComposition.makeUpdate({
  ToggledSelectAll: (model, { isChecked }) => ({
    model: modifyFields(model, {
      optionA: () => isChecked,
      optionB: () => isChecked,
    }),
  }),
  ToggledOptionA: (model, { isChecked }) => ({
    model: modifyFields(model, { optionA: () => isChecked }),
  }),
  ToggledOptionB: (model, { isChecked }) => ({
    model: modifyFields(model, { optionB: () => isChecked }),
  }),
})

// Inside your view function, compute the parent's checked and indeterminate
// state from the children and pass isIndeterminate straight to Checkbox.view:
const view = NotificationPreferencesComposition.makeView((model, h) => {
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

  const selectAllView = (
    attributes: Checkbox.CheckboxAttributes<typeof Message.Type>,
  ) =>
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
    )

  return Checkbox.view(
    {
      id: 'select-all',
      isChecked: isAllChecked,
      isIndeterminate,
      onToggle: isChecked => Message.ToggledSelectAll({ isChecked }),
      toView: selectAllView,
    },
    h,
  )
})

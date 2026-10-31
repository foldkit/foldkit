import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Checkbox } from '@foldkit/ui'

const Message = defineMessageUnion({
  ToggledSelectAll: { isChecked: Schema.Boolean },
  ToggledOptionA: { isChecked: Schema.Boolean },
  ToggledOptionB: { isChecked: Schema.Boolean },
})
type Message = typeof Message.Type

export class NotificationPreferences extends Block<NotificationPreferences>()(
  'NotificationPreferences',
  {
    Model: Schema.Struct({
      optionA: Schema.Boolean,
      optionB: Schema.Boolean,
    }),
    Message,
  },
) {}

export const NotificationPreferencesLive = NotificationPreferences.make(
  Effect.fn(function* () {
    return {
      model: { optionA: false, optionB: false },

      update: {
        // Toggling "Select All" writes the same value to every option
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
      },

      // Compute the parent's checked and indeterminate state from the options
      // and pass isIndeterminate straight to Checkbox.view
      view: (model, h) => {
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
          attributes: Checkbox.CheckboxAttributes<Message>,
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
      },
    }
  }),
)

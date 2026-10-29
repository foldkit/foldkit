// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Switch } from '@foldkit/ui'

// Store the on/off state as a plain boolean field in your Model:
const Model = Schema.Struct({
  notificationsEnabled: Schema.Boolean,
  // ...your other fields
})
type Model = typeof Model.Type
// A verb-first, past-tense Message carries the new checked state:

const Message = defineMessageUnion({
  ToggledNotifications: { isChecked: Schema.Boolean },
})
type Message = typeof Message.Type

const NotificationSettingsComposition = Block.makeDefinition(
  'NotificationSettings',
  {
    Model,
    Message,
  },
).makeComposition()

// In your init function, start it off:
const init = NotificationSettingsComposition.makeInit(() => ({
  model: {
    notificationsEnabled: false,
    // ...your other fields
  },
}))

// In the corresponding update handler, store the value. Return Commands
// to persist the preference, sync to a backend, or record analytics.
const update = NotificationSettingsComposition.makeUpdate({
  ToggledNotifications: (model, { isChecked }) => ({
    model: modifyFields(model, { notificationsEnabled: () => isChecked }),
  }),
})

// Inside your view function, render the switch with Switch.view. It reads the
// checked state from your Model and calls onToggle with the new state. The
// track color keys off the data-checked attribute; the knob position derives
// from the same Model field.
const view = NotificationSettingsComposition.makeView((model, h) => {
  const switchView = (attributes: Switch.SwitchAttributes<Message>) =>
    h.div(
      [h.Class('flex items-center gap-3')],
      [
        h.button(
          [
            ...attributes.button,
            h.Class(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors data-[checked]:bg-blue-600 bg-gray-200',
            ),
          ],
          [
            h.span([
              h.Class(
                `inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${model.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`,
              ),
            ]),
          ],
        ),
        h.div(
          [],
          [
            h.label(
              [...attributes.label, h.Class('text-sm font-medium')],
              ['Enable notifications'],
            ),
            h.p(
              [...attributes.description, h.Class('text-sm text-gray-500')],
              ['Get notified when something important happens.'],
            ),
          ],
        ),
      ],
    )

  return Switch.view(
    {
      id: 'notifications',
      isChecked: model.notificationsEnabled,
      hasDescription: true,
      onToggle: isChecked => Message.ToggledNotifications({ isChecked }),
      toView: switchView,
    },
    h,
  )
})

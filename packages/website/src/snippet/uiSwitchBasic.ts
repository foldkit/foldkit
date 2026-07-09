// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Switch } from '@foldkit/ui'

// Store the on/off state as a plain boolean field in your Model:
const Model = S.Struct({
  notificationsEnabled: S.Boolean,
  // ...your other fields
})

// In your init function, start it off:
const init = () => [
  {
    notificationsEnabled: false,
    // ...your other fields
  },
  [],
]

// A verb-first, past-tense Message carries the new checked state:
const ToggledNotifications = m('ToggledNotifications', {
  isChecked: S.Boolean,
})

const Message = S.Union([ToggledNotifications])

// Inside your update function's M.tagsExhaustive({...}), store the value.
// This is the moment to persist the preference, sync to a backend, or fire
// analytics.
ToggledNotifications: ({ isChecked }) => [
  evo(model, { notificationsEnabled: () => isChecked }),
  [],
]

// Inside your view function, render the switch with Switch.view. It reads the
// checked state from your Model and calls onToggle with the new state. The
// track color keys off the data-checked attribute; the knob position derives
// from the same Model field.
const view = model => {
  const h = html<Message>()

  return Switch.view<Message>({
    id: 'notifications',
    isChecked: model.notificationsEnabled,
    onToggle: isChecked => ToggledNotifications({ isChecked }),
    toView: attributes =>
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
              h.span(
                [
                  h.Class(
                    `inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${model.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`,
                  ),
                ],
                [],
              ),
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
      ),
  })
}

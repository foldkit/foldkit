import { html } from 'foldkit/html'

import { Switch } from '@foldkit/ui'

import { type Message, ToggledSwitchDemo } from './message'

export const SWITCH_DEMO_ID = 'switch-demo'

// DEMO CONTENT

const wrapperClassName = 'flex items-center gap-3'

const buttonClassName =
  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-gray-300 dark:bg-gray-600 data-[checked]:bg-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'text-sm font-normal text-gray-900 dark:text-white cursor-pointer select-none'

const descriptionClassName = 'text-sm text-gray-500 dark:text-gray-400'

// VIEW

export const basicDemo = (isSwitchDemoChecked: boolean) => {
  const h = html<Message>()

  const knob = (isKnobRight: boolean) =>
    h.span(
      [
        h.Class(
          `pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isKnobRight ? 'translate-x-6' : 'translate-x-1'}`,
        ),
      ],
      [],
    )

  return [
    Switch.view<Message>({
      id: SWITCH_DEMO_ID,
      isChecked: isSwitchDemoChecked,
      onToggle: isChecked => ToggledSwitchDemo({ isChecked }),
      toView: attributes =>
        h.div(
          [h.Class(wrapperClassName)],
          [
            h.button(
              [...attributes.button, h.Class(buttonClassName)],
              [knob(isSwitchDemoChecked)],
            ),
            h.div(
              [],
              [
                h.label(
                  [...attributes.label, h.Class(labelClassName)],
                  ['Enable notifications'],
                ),
                h.p(
                  [...attributes.description, h.Class(descriptionClassName)],
                  ['Get notified when something important happens.'],
                ),
              ],
            ),
          ],
        ),
    }),
  ]
}

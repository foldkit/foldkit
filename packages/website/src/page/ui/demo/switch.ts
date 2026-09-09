import type { HtmlBuilder } from 'foldkit/html'

import { Switch } from '@foldkit/ui'

import { Message } from '../message'

export const SWITCH_DEMO_ID = 'switch-demo'

// DEMO CONTENT

const wrapperClassName = 'flex items-center gap-3'

const buttonClassName =
  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-gray-300 dark:bg-gray-600 data-[checked]:bg-accent-600 data-[checked]:dark:bg-accent-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:focus-visible:outline-accent-400 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

// VIEW

export const basicDemo = (
  isSwitchDemoChecked: boolean,
  h: HtmlBuilder<Message>,
) => {
  const knob = (isKnobRight: boolean) =>
    h.span([
      h.Class(
        `pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isKnobRight ? 'translate-x-6' : 'translate-x-1'}`,
      ),
    ])

  return [
    Switch.view(
      {
        id: SWITCH_DEMO_ID,
        isChecked: isSwitchDemoChecked,
        onToggle: isChecked => Message.ToggledSwitchDemo({ isChecked }),
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
                    [...attributes.label, h.Class('demo-toggle-label')],
                    ['Enable notifications'],
                  ),
                  h.p(
                    [...attributes.description, h.Class('demo-description')],
                    ['Get notified when something important happens.'],
                  ),
                ],
              ),
            ],
          ),
      },
      h,
    ),
  ]
}

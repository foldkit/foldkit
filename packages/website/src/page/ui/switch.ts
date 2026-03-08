import { Ui } from 'foldkit'

import { Class, button, div, label, p, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { GotSwitchDemoMessage, type Message } from './message'

// TABLE OF CONTENTS

export const switchHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'switch',
  text: 'Switch',
}

// DEMO CONTENT

const wrapperClassName = 'flex items-center gap-3'

const buttonClassName =
  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-gray-300 dark:bg-gray-600 data-[checked]:bg-accent-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'text-sm font-normal text-gray-900 dark:text-white cursor-pointer select-none'

const descriptionClassName = 'text-sm text-gray-500 dark:text-gray-400'

const knob = (isChecked: boolean) =>
  span(
    [
      Class(
        `pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-1'}`,
      ),
    ],
    [],
  )

// VIEW

export const switchDemo = (
  switchModel: Ui.Switch.Model,
  toMessage: (message: Message) => ParentMessage,
) => [
  div(
    [Class('mt-6')],
    [
      Ui.Switch.view({
        model: switchModel,
        toMessage: message => toMessage(GotSwitchDemoMessage({ message })),
        toView: attributes =>
          div(
            [Class(wrapperClassName)],
            [
              button(
                [...attributes.button, Class(buttonClassName)],
                [knob(switchModel.isChecked)],
              ),
              div(
                [],
                [
                  label(
                    [...attributes.label, Class(labelClassName)],
                    ['Enable notifications'],
                  ),
                  p(
                    [...attributes.description, Class(descriptionClassName)],
                    ['Get notified when something important happens.'],
                  ),
                ],
              ),
            ],
          ),
      }),
    ],
  ),
]

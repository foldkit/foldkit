import { Ui } from 'foldkit'

import { Class, div, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { GotSwitchDemoMessage, type Message } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

export const switchHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'switch',
  text: 'Switch',
}

// DEMO CONTENT

const wrapperClassName = 'flex items-center gap-3'

const buttonClassName =
  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer bg-gray-300 dark:bg-gray-600 data-[checked]:bg-blue-600 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const labelClassName =
  'text-sm font-medium text-gray-900 dark:text-white cursor-pointer select-none'

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
  model: Model,
  toMessage: (message: Message) => ParentMessage,
) => [
  div([Class('mt-6')], [
    Ui.Switch.view({
      model: model.switchDemo,
      toMessage: message =>
        toMessage(GotSwitchDemoMessage({ message })),
      label: 'Enable notifications',
      description: 'Get notified when something important happens.',
      buttonContent: knob(model.switchDemo.isChecked),
      buttonClassName,
      labelClassName,
      className: wrapperClassName,
    }),
  ]),
]

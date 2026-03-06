import { Ui } from 'foldkit'

import { Class, div, p, span } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { GotDisclosureDemoMessage, type Message } from './message'

// TABLE OF CONTENTS

export const disclosureHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'disclosure',
  text: 'Disclosure',
}

// DEMO CONTENT

const buttonClassName =
  'w-full flex items-center justify-between px-4 py-3 text-left text-base font-normal cursor-pointer transition border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-200/50 dark:hover:bg-gray-800 rounded-lg data-[open]:rounded-b-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 select-none'

const panelClassName =
  'px-4 py-3 border-x border-b border-gray-300 dark:border-gray-700 rounded-b-lg text-gray-800 dark:text-gray-200'

const chevron = (isOpen: boolean) =>
  span(
    [
      Class(
        `text-gray-600 dark:text-gray-300 ${isOpen ? 'rotate-180' : ''}`,
      ),
    ],
    [Icon.chevronDown('w-4 h-4')],
  )

// VIEW

export const disclosureDemo = (
  disclosureModel: Ui.Disclosure.Model,
  toMessage: (message: Message) => ParentMessage,
) => [
  Ui.Disclosure.view({
    model: disclosureModel,
    toMessage: message =>
      toMessage(GotDisclosureDemoMessage({ message })),
    buttonClassName,
    buttonContent: div(
      [Class('flex items-center justify-between w-full')],
      [
        span([], ['What is Foldkit?']),
        chevron(disclosureModel.isOpen),
      ],
    ),
    panelClassName,
    panelContent: p(
      [Class('text-gray-800 dark:text-gray-200')],
      [
        'Foldkit is an Elm-inspired UI framework powered by Effect. It brings the Model-View-Update architecture to TypeScript with Schema-typed state, explicit side effects via commands, and composable headless UI components.',
      ],
    ),
  }),
]

import { Ui } from 'foldkit'
import type { AnchorConfig } from 'foldkit/ui/popover'

import { Class, div, p, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const popoverHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'popover',
  text: 'Popover',
}

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'basic-popover',
  text: 'Basic',
}

export const animatedHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'animated-popover',
  text: 'Animated',
}

// DEMO CONTENT

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const basicPanelClassName =
  'w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg p-4 z-10 outline-none'

const animatedPanelClassName =
  'w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg p-4 z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

// VIEW

const POPOVER_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const panelContent = div(
  [],
  [
    p(
      [Class('text-sm font-semibold text-gray-900 dark:text-white mb-2')],
      ['Analytics'],
    ),
    p(
      [Class('text-sm text-gray-600 dark:text-gray-400')],
      ['Get a better understanding of where your traffic is coming from.'],
    ),
  ],
)

const popoverViewConfig = (panelClassName: string) => ({
  anchor: POPOVER_ANCHOR,
  buttonContent: span([], ['Solutions']),
  buttonAttributes: [Class(triggerClassName)],
  panelContent,
  panelAttributes: [Class(panelClassName)],
  backdropAttributes: [Class(backdropClassName)],
  attributes: [Class(wrapperClassName)],
})

export const basicDemo = (
  popoverModel: Ui.Popover.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  div(
    [Class('relative')],
    [
      Ui.Popover.view({
        model: popoverModel,
        toParentMessage: message =>
          toParentMessage(GotPopoverBasicDemoMessage({ message })),
        ...popoverViewConfig(basicPanelClassName),
      }),
    ],
  ),
]

export const animatedDemo = (
  popoverModel: Ui.Popover.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  div(
    [Class('relative')],
    [
      Ui.Popover.view({
        model: popoverModel,
        toParentMessage: message =>
          toParentMessage(GotPopoverAnimatedDemoMessage({ message })),
        ...popoverViewConfig(animatedPanelClassName),
      }),
    ],
  ),
]

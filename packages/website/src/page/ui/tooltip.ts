import { Ui } from 'foldkit'
import type { AnchorConfig } from 'foldkit/ui/tooltip'

import { Class, div, span } from '../../html'
import type { Message as ParentMessage } from '../../main'
import { GotTooltipDemoMessage, type Message } from './message'

// DEMO CONTENT

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const panelClassName =
  'rounded-md bg-gray-900 dark:bg-gray-700 px-3 py-1.5 text-sm text-white shadow-lg'

const wrapperClassName = 'relative inline-block'

// VIEW

const TOOLTIP_ANCHOR: AnchorConfig = {
  placement: 'top',
  gap: 6,
  padding: 8,
}

export const demo = (
  tooltipModel: Ui.Tooltip.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => [
  div(
    [Class('relative')],
    [
      Ui.Tooltip.view({
        model: tooltipModel,
        toParentMessage: message =>
          toParentMessage(GotTooltipDemoMessage({ message })),
        anchor: TOOLTIP_ANCHOR,
        triggerContent: span([], ['Hover or focus me']),
        triggerAttributes: [Class(triggerClassName)],
        content: span([], ['This is a tooltip']),
        panelAttributes: [Class(panelClassName)],
        attributes: [Class(wrapperClassName)],
      }),
    ],
  ),
]

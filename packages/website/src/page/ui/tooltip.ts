import { Ui } from 'foldkit'
import { html } from 'foldkit/html'
import type { AnchorConfig } from 'foldkit/ui/tooltip'

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

export const demo = <ParentMessage>(
  tooltipModel: Ui.Tooltip.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const h = html<ParentMessage>()

  return [
    h.div(
      [h.Class('relative')],
      [
        Ui.Tooltip.view({
          model: tooltipModel,
          toParentMessage: message =>
            toParentMessage(GotTooltipDemoMessage({ message })),
          anchor: TOOLTIP_ANCHOR,
          triggerContent: h.span([], ['Hover or focus me']),
          triggerAttributes: [h.Class(triggerClassName)],
          content: h.span([], ['This is a tooltip']),
          panelAttributes: [h.Class(panelClassName)],
          attributes: [h.Class(wrapperClassName)],
        }),
      ],
    ),
  ]
}

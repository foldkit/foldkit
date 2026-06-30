import { html } from 'foldkit/html'

import { Tooltip } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/tooltip'

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

export const demo = (tooltipModel: Tooltip.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Tooltip.triggerId(tooltipModel.id)),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
          ['Tooltip trigger'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.submodel({
              slotId: tooltipModel.id,
              model: tooltipModel,
              view: Tooltip.view,
              viewInputs: {
                anchor: TOOLTIP_ANCHOR,
                toView: ({ trigger, panel, isVisible }) =>
                  h.div(
                    [h.Class(wrapperClassName)],
                    [
                      h.button(
                        [...trigger, h.Class(triggerClassName)],
                        [h.span([], ['Hover or focus me'])],
                      ),
                      ...(isVisible
                        ? [
                            h.div(
                              [...panel, h.Class(panelClassName)],
                              [h.span([], ['This is a tooltip'])],
                            ),
                          ]
                        : []),
                    ],
                  ),
              },
              toParentMessage: message => GotTooltipDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}

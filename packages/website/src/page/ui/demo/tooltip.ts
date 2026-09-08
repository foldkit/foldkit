import type { HtmlBuilder } from 'foldkit/html'

import { Tooltip } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/tooltip'

import { Message } from '../message'

// DEMO CONTENT

const triggerClassName = 'demo-neutral-button inline-flex items-center gap-1.5'

const panelClassName =
  'rounded-md bg-gray-900 dark:bg-gray-700 px-3 py-1.5 text-sm text-white shadow-lg'

const wrapperClassName = 'relative inline-block'

// VIEW

const TOOLTIP_ANCHOR: AnchorConfig = {
  placement: 'top',
  gap: 6,
  padding: 8,
}

export const demo = (tooltipModel: Tooltip.Model, h: HtmlBuilder<Message>) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(Tooltip.triggerId(tooltipModel.id)), h.Class('demo-label')],
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
              toParentMessage: message =>
                Message.GotTooltipDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}

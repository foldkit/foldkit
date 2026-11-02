import type { Tooltip } from '@foldkit/ui'
import { type AnchorConfig, triggerId } from '@foldkit/ui/tooltip'

import type { UiViewBuilder } from '../definition'

type TooltipModel = Tooltip.Tooltip

// DEMO CONTENT

const triggerClassName = 'demo-neutral-button inline-flex items-center gap-1.5'

const panelClassName =
  'rounded-md bg-gray-900 dark:bg-gray-700 px-3 py-1.5 text-sm text-white shadow-lg'

const wrapperClassName = 'relative inline-block'

const TOOLTIP_ANCHOR: AnchorConfig = {
  placement: 'top',
  gap: 6,
  padding: 8,
}

export const demo = (tooltipModel: TooltipModel, h: UiViewBuilder) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(triggerId(tooltipModel.model.id)), h.Class('demo-label')],
          ['Tooltip trigger'],
        ),
        h.div(
          [h.Class('relative')],
          [
            tooltipModel.view({
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
            }),
          ],
        ),
      ],
    ),
  ]
}

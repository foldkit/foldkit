import { Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'
import type { AnchorConfig } from 'foldkit/ui/tooltip'

import {
  GotTooltipBasicDemoMessage,
  GotTooltipNoDelayDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const panelClassName =
  'rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white shadow-lg'

const wrapperClassName = 'relative inline-block'

const TOOLTIP_ANCHOR: AnchorConfig = {
  placement: 'top',
  gap: 6,
  padding: 8,
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Tooltip']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.submodel({
            slotId: model.tooltipBasicDemo.id,
            model: model.tooltipBasicDemo,
            view: Ui.Tooltip.view,
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
            toParentMessage: message => GotTooltipBasicDemoMessage({ message }),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['No delay'],
      ),
      h.div(
        [h.Class('relative')],
        [
          h.submodel({
            slotId: model.tooltipNoDelayDemo.id,
            model: model.tooltipNoDelayDemo,
            view: Ui.Tooltip.view,
            viewInputs: {
              anchor: TOOLTIP_ANCHOR,
              toView: ({ trigger, panel, isVisible }) =>
                h.div(
                  [h.Class(wrapperClassName)],
                  [
                    h.button(
                      [...trigger, h.Class(triggerClassName)],
                      [h.span([], ['No delay'])],
                    ),
                    ...(isVisible
                      ? [
                          h.div(
                            [...panel, h.Class(panelClassName)],
                            [h.span([], ['Shows immediately'])],
                          ),
                        ]
                      : []),
                  ],
                ),
            },
            toParentMessage: message =>
              GotTooltipNoDelayDemoMessage({ message }),
          }),
        ],
      ),
    ],
  )
})

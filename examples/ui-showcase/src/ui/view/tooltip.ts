import { Ui } from 'foldkit'
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

export const view = <ParentMessage>(
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

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
          Ui.Tooltip.view({
            model: model.tooltipBasicDemo,
            toParentMessage: message =>
              toParentMessage(GotTooltipBasicDemoMessage({ message })),
            anchor: TOOLTIP_ANCHOR,
            triggerContent: h.span([], ['Hover or focus me']),
            triggerAttributes: [h.Class(triggerClassName)],
            content: h.span([], ['This is a tooltip']),
            panelAttributes: [h.Class(panelClassName)],
            attributes: [h.Class(wrapperClassName)],
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
          Ui.Tooltip.view({
            model: model.tooltipNoDelayDemo,
            toParentMessage: message =>
              toParentMessage(GotTooltipNoDelayDemoMessage({ message })),
            anchor: TOOLTIP_ANCHOR,
            triggerContent: h.span([], ['No delay']),
            triggerAttributes: [h.Class(triggerClassName)],
            content: h.span([], ['Shows immediately']),
            panelAttributes: [h.Class(panelClassName)],
            attributes: [h.Class(wrapperClassName)],
          }),
        ],
      ),
    ],
  )
}

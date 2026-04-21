import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'
import type { AnchorConfig } from 'foldkit/ui/tooltip'

import { Class, div, h2, h3, span } from '../html'
import type { Message as ParentMessage } from '../main'
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

export const view = (
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Tooltip']),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Basic']),
      div(
        [Class('relative')],
        [
          Ui.Tooltip.view({
            model: model.tooltipBasicDemo,
            toParentMessage: message =>
              toParentMessage(GotTooltipBasicDemoMessage({ message })),
            anchor: TOOLTIP_ANCHOR,
            triggerContent: span([], ['Hover or focus me']),
            triggerAttributes: [Class(triggerClassName)],
            content: span([], ['This is a tooltip']),
            panelAttributes: [Class(panelClassName)],
            attributes: [Class(wrapperClassName)],
          }),
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['No delay'],
      ),
      div(
        [Class('relative')],
        [
          Ui.Tooltip.view({
            model: model.tooltipNoDelayDemo,
            toParentMessage: message =>
              toParentMessage(GotTooltipNoDelayDemoMessage({ message })),
            anchor: TOOLTIP_ANCHOR,
            triggerContent: span([], ['No delay']),
            triggerAttributes: [Class(triggerClassName)],
            content: span([], ['Shows immediately']),
            panelAttributes: [Class(panelClassName)],
            attributes: [Class(wrapperClassName)],
          }),
        ],
      ),
    ],
  )

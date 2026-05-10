import { Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import {
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const basicPanelClassName =
  'w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-4 z-10 outline-none'

const animatedPanelClassName =
  'w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-4 z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const POPOVER_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 4,
  padding: 8,
}

export const view = <ParentMessage>(
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  const panelContent = h.div(
    [],
    [
      h.p([h.Class('text-sm font-semibold text-gray-900 mb-2')], ['Analytics']),
      h.p(
        [h.Class('text-sm text-gray-600')],
        ['Get a better understanding of where your traffic is coming from.'],
      ),
    ],
  )

  const popoverViewConfig = (panelClassNameValue: string) => ({
    anchor: POPOVER_ANCHOR,
    buttonContent: h.span([], ['Solutions']),
    buttonAttributes: [h.Class(triggerClassName)],
    panelContent,
    panelAttributes: [h.Class(panelClassNameValue)],
    backdropAttributes: [h.Class(backdropClassName)],
    attributes: [h.Class(wrapperClassName)],
  })

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Popover']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.div(
        [h.Class('relative')],
        [
          Ui.Popover.view({
            model: model.popoverBasicDemo,
            toParentMessage: message =>
              toParentMessage(GotPopoverBasicDemoMessage({ message })),
            ...popoverViewConfig(basicPanelClassName),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      h.div(
        [h.Class('relative')],
        [
          Ui.Popover.view({
            model: model.popoverAnimatedDemo,
            toParentMessage: message =>
              toParentMessage(GotPopoverAnimatedDemoMessage({ message })),
            ...popoverViewConfig(animatedPanelClassName),
          }),
        ],
      ),
    ],
  )
}

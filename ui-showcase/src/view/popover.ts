import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, div, h2, h3, p, span } from '../html'
import type { Message as ParentMessage } from '../main'
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

const panelContent = div(
  [],
  [
    p([Class('text-sm font-semibold text-gray-900 mb-2')], ['Analytics']),
    p(
      [Class('text-sm text-gray-600')],
      ['Get a better understanding of where your traffic is coming from.'],
    ),
  ],
)

const popoverViewConfig = (panelClassNameValue: string) => ({
  anchor: POPOVER_ANCHOR,
  buttonContent: span([], ['Solutions']),
  buttonAttributes: [Class(triggerClassName)],
  panelContent,
  panelAttributes: [Class(panelClassNameValue)],
  backdropAttributes: [Class(backdropClassName)],
  attributes: [Class(wrapperClassName)],
})

export const view = (
  model: UiModel,
  toParentMessage: (message: UiMessage) => ParentMessage,
): Html =>
  div(
    [],
    [
      h2([Class('text-2xl font-bold text-gray-900 mb-6')], ['Popover']),

      h3([Class('text-lg font-semibold text-gray-900 mt-8 mb-4')], ['Basic']),
      div(
        [Class('relative')],
        [
          Ui.Popover.view({
            model: model.popoverBasicDemo,
            toParentMessage: message =>
              toParentMessage(GotPopoverBasicDemoMessage({ message })),
            ...popoverViewConfig(basicPanelClassName),
          }),
        ],
      ),

      h3(
        [Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      div(
        [Class('relative')],
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

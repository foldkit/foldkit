import { Submodel, Ui } from 'foldkit'
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

const popoverPanelContent = (): Html => {
  const h = html()

  return h.div(
    [],
    [
      h.p([h.Class('text-sm font-semibold text-gray-900 mb-2')], ['Analytics']),
      h.p(
        [h.Class('text-sm text-gray-600')],
        ['Get a better understanding of where your traffic is coming from.'],
      ),
    ],
  )
}

const popoverDemo = (
  id: string,
  popoverModel: Ui.Popover.Model,
  toParentMessage: (message: Ui.Popover.Message) => UiMessage,
  panelClassNameValue: string,
): Html => {
  const h = html<UiMessage>()

  return h.submodel({
    slotId: id,
    model: popoverModel,
    view: Ui.Popover.view,
    viewInputs: {
      anchor: POPOVER_ANCHOR,
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [h.Class(wrapperClassName)],
          [
            h.button(
              [...button, h.Class(triggerClassName)],
              [h.span([], ['Solutions'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class(backdropClassName)], []),
                  h.div(
                    [...panel, h.Class(panelClassNameValue)],
                    [popoverPanelContent()],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage,
  })
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

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
          popoverDemo(
            model.popoverBasicDemo.id,
            model.popoverBasicDemo,
            message => GotPopoverBasicDemoMessage({ message }),
            basicPanelClassName,
          ),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      h.div(
        [h.Class('relative')],
        [
          popoverDemo(
            model.popoverAnimatedDemo.id,
            model.popoverAnimatedDemo,
            message => GotPopoverAnimatedDemoMessage({ message }),
            animatedPanelClassName,
          ),
        ],
      ),
    ],
  )
})

import { Ui } from 'foldkit'
import { type Html, html } from 'foldkit/html'
import type { AnchorConfig } from 'foldkit/ui/popover'

import type { TableOfContentsEntry } from '../../main'
import {
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

export const popoverHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'popover',
  text: 'Popover',
}

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'basic-popover',
  text: 'Basic',
}

export const animatedHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'animated-popover',
  text: 'Animated',
}

// DEMO CONTENT

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-cream dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const basicPanelClassName =
  'w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg p-4 z-10 outline-none'

const animatedPanelClassName =
  'w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-cream dark:bg-gray-800 shadow-lg p-4 z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

// VIEW

const POPOVER_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const panelContent = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.p(
        [h.Class('text-sm font-semibold text-gray-900 dark:text-white mb-2')],
        ['Analytics'],
      ),
      h.p(
        [h.Class('text-sm text-gray-600 dark:text-gray-400')],
        ['Get a better understanding of where your traffic is coming from.'],
      ),
    ],
  )
}

const popoverDemo = (
  popoverModel: Ui.Popover.Model,
  toMessage: (message: Ui.Popover.Message) => Message,
  panelClassNameValue: string,
): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId: popoverModel.id,
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
                    [panelContent()],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: toMessage,
  })
}

export const basicDemo = (popoverModel: Ui.Popover.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('relative')],
      [
        popoverDemo(
          popoverModel,
          message => GotPopoverBasicDemoMessage({ message }),
          basicPanelClassName,
        ),
      ],
    ),
  ]
}

export const animatedDemo = (popoverModel: Ui.Popover.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('relative')],
      [
        popoverDemo(
          popoverModel,
          message => GotPopoverAnimatedDemoMessage({ message }),
          animatedPanelClassName,
        ),
      ],
    ),
  ]
}

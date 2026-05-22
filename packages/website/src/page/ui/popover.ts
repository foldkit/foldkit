import { Ui } from 'foldkit'
import { html } from 'foldkit/html'
import type { AnchorConfig } from 'foldkit/ui/popover'

import type { TableOfContentsEntry } from '../../main'
import {
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotPopoverNestedChildDemoMessage,
  GotPopoverNestedParentDemoMessage,
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

export const nestedHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'nested-popovers',
  text: 'Nested',
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

const nestedChildButtonSelector = '#popover-nested-child-demo-button'

// VIEW

const POPOVER_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const NESTED_POPOVER_ANCHOR: AnchorConfig = {
  placement: 'right-start',
  gap: 8,
  padding: 8,
}

const popoverViewConfig = <ParentMessage>(panelClassName: string) => {
  const h = html<ParentMessage>()

  const panelContent = h.div(
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

  return {
    anchor: POPOVER_ANCHOR,
    buttonContent: h.span([], ['Solutions']),
    buttonAttributes: [h.Class(triggerClassName)],
    panelContent,
    panelAttributes: [h.Class(panelClassName)],
    backdropAttributes: [h.Class(backdropClassName)],
    attributes: [h.Class(wrapperClassName)],
  }
}

export const basicDemo = <ParentMessage>(
  popoverModel: Ui.Popover.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const h = html<ParentMessage>()

  return [
    h.div(
      [h.Class('relative')],
      [
        Ui.Popover.view({
          model: popoverModel,
          toParentMessage: message =>
            toParentMessage(GotPopoverBasicDemoMessage({ message })),
          ...popoverViewConfig<ParentMessage>(basicPanelClassName),
        }),
      ],
    ),
  ]
}

export const animatedDemo = <ParentMessage>(
  popoverModel: Ui.Popover.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const h = html<ParentMessage>()

  return [
    h.div(
      [h.Class('relative')],
      [
        Ui.Popover.view({
          model: popoverModel,
          toParentMessage: message =>
            toParentMessage(GotPopoverAnimatedDemoMessage({ message })),
          ...popoverViewConfig<ParentMessage>(animatedPanelClassName),
        }),
      ],
    ),
  ]
}

export const nestedDemo = <ParentMessage>(
  parentPopoverModel: Ui.Popover.Model,
  childPopoverModel: Ui.Popover.Model,
  toParentMessage: (message: Message) => ParentMessage,
) => {
  const h = html<ParentMessage>()

  const childPopover = Ui.Popover.view({
    model: childPopoverModel,
    toParentMessage: message =>
      toParentMessage(GotPopoverNestedChildDemoMessage({ message })),
    anchor: NESTED_POPOVER_ANCHOR,
    buttonContent: h.span([], ['Advanced settings']),
    buttonAttributes: [h.Class(triggerClassName)],
    panelContent: h.div(
      [],
      [
        h.p(
          [h.Class('text-sm font-semibold text-gray-900 dark:text-white mb-2')],
          ['Permissions'],
        ),
        h.p(
          [h.Class('text-sm text-gray-600 dark:text-gray-400')],
          ['Review who can change billing, members, and integrations.'],
        ),
      ],
    ),
    panelAttributes: [h.Class(basicPanelClassName)],
    backdropAttributes: [h.Class(backdropClassName)],
    attributes: [h.Class(wrapperClassName)],
  })

  return [
    h.div(
      [h.Class('relative')],
      [
        Ui.Popover.view({
          model: parentPopoverModel,
          toParentMessage: message =>
            toParentMessage(GotPopoverNestedParentDemoMessage({ message })),
          anchor: POPOVER_ANCHOR,
          focusSelector: nestedChildButtonSelector,
          buttonContent: h.span([], ['Account']),
          buttonAttributes: [h.Class(triggerClassName)],
          panelContent: h.div(
            [h.Class('flex flex-col gap-4')],
            [
              h.p(
                [h.Class('text-sm text-gray-600 dark:text-gray-400')],
                ['Manage account settings without leaving this panel.'],
              ),
              childPopover,
            ],
          ),
          panelAttributes: [h.Class(basicPanelClassName)],
          backdropAttributes: [h.Class(backdropClassName)],
          attributes: [h.Class(wrapperClassName)],
        }),
      ],
    ),
  ]
}

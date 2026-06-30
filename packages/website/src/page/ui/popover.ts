import { type Html, html } from 'foldkit/html'

import { Popover } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/popover'

import type { TableOfContentsEntry } from '../../main'
import {
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotPopoverNestedChildDemoMessage,
  GotPopoverNestedParentDemoMessage,
  type Message,
} from './message'

// TABLE OF CONTENTS

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

const nestedChildButtonSelector = '#popover-nested-child-demo-button'

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
  popoverModel: Popover.Model,
  toMessage: (message: Popover.Message) => Message,
  panelClassNameValue: string,
): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId: popoverModel.id,
    model: popoverModel,
    view: Popover.view,
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

export const basicDemo = (popoverModel: Popover.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Popover.buttonId(popoverModel.id)),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
          ['Product menu'],
        ),
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
      ],
    ),
  ]
}

export const animatedDemo = (popoverModel: Popover.Model) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Popover.buttonId(popoverModel.id)),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
          ['Product menu'],
        ),
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
      ],
    ),
  ]
}

const nestedChildPopover = (childPopoverModel: Popover.Model): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId: childPopoverModel.id,
    model: childPopoverModel,
    view: Popover.view,
    viewInputs: {
      ariaLabel: 'Advanced settings',
      anchor: NESTED_POPOVER_ANCHOR,
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [h.Class(wrapperClassName)],
          [
            h.button(
              [...button, h.Class(triggerClassName)],
              [h.span([], ['Advanced settings'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class(backdropClassName)], []),
                  h.div(
                    [...panel, h.Class(basicPanelClassName)],
                    [
                      h.p(
                        [
                          h.Class(
                            'text-sm font-semibold text-gray-900 dark:text-white mb-2',
                          ),
                        ],
                        ['Permissions'],
                      ),
                      h.p(
                        [h.Class('text-sm text-gray-600 dark:text-gray-400')],
                        [
                          'Review who can change billing, members, and integrations.',
                        ],
                      ),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message => GotPopoverNestedChildDemoMessage({ message }),
  })
}

export const nestedDemo = (
  parentPopoverModel: Popover.Model,
  childPopoverModel: Popover.Model,
) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('flex flex-col gap-1.5')],
      [
        h.label(
          [
            h.For(Popover.buttonId(parentPopoverModel.id)),
            h.Class('text-sm font-medium text-gray-900 dark:text-white'),
          ],
          ['Account'],
        ),
        h.div(
          [h.Class('relative')],
          [
            h.submodel({
              slotId: parentPopoverModel.id,
              model: parentPopoverModel,
              view: Popover.view,
              viewInputs: {
                anchor: POPOVER_ANCHOR,
                focusSelector: nestedChildButtonSelector,
                toView: ({ button, panel, backdrop, isVisible }) =>
                  h.div(
                    [h.Class(wrapperClassName)],
                    [
                      h.button(
                        [...button, h.Class(triggerClassName)],
                        [h.span([], ['Account'])],
                      ),
                      ...(isVisible
                        ? [
                            h.div(
                              [...backdrop, h.Class(backdropClassName)],
                              [],
                            ),
                            h.div(
                              [...panel, h.Class(basicPanelClassName)],
                              [
                                h.div(
                                  [h.Class('flex flex-col gap-4')],
                                  [
                                    h.p(
                                      [
                                        h.Class(
                                          'text-sm text-gray-600 dark:text-gray-400',
                                        ),
                                      ],
                                      [
                                        'Manage account settings without leaving this panel.',
                                      ],
                                    ),
                                    nestedChildPopover(childPopoverModel),
                                  ],
                                ),
                              ],
                            ),
                          ]
                        : []),
                    ],
                  ),
              },
              toParentMessage: message =>
                GotPopoverNestedParentDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}

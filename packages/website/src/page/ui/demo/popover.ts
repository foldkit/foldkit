import { type Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { Popover } from '@foldkit/ui'
import type { AnchorConfig } from '@foldkit/ui/popover'

import { Message } from '../message'

// DEMO CONTENT

const triggerClassName = 'demo-neutral-button inline-flex items-center gap-1.5'

const basicPanelClassName = 'demo-popup-surface w-64 p-4'

const animatedPanelClassName = `${basicPanelClassName} transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0`

type PanelVariant = 'Basic' | 'Animated' | 'Arrow'

const panelClassNames: Readonly<Record<PanelVariant, string>> = {
  Basic: basicPanelClassName,
  Animated: animatedPanelClassName,
  Arrow: `popover-panel ${basicPanelClassName}`,
}

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

// VIEW

const POPOVER_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const POPOVER_ARROW_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 10,
  padding: 8,
}

const POPOVER_ARROW_PADDING = 12

const NESTED_POPOVER_ANCHOR: AnchorConfig = {
  placement: 'right-start',
  gap: 8,
  padding: 8,
}

const nestedChildButtonSelector = '#popover-nested-child-demo-button'

const panelContent = (): Html =>
  ih.div(
    [],
    [
      ih.p(
        [ih.Class('text-sm font-semibold text-gray-900 dark:text-white mb-2')],
        ['Analytics'],
      ),
      ih.p(
        [ih.Class('text-sm text-gray-600 dark:text-gray-400')],
        ['Get a better understanding of where your traffic is coming from.'],
      ),
    ],
  )

const popoverDemo = (
  popoverModel: Popover.Model,
  toMessage: (message: Popover.Message) => Message,
  panelVariant: PanelVariant,
  h: HtmlBuilder<Message>,
): Html => {
  const isArrowDrawn = panelVariant === 'Arrow'

  return h.submodel({
    slotId: popoverModel.id,
    model: popoverModel,
    view: Popover.view,
    viewInputs: {
      anchor: isArrowDrawn ? POPOVER_ARROW_ANCHOR : POPOVER_ANCHOR,
      ...(isArrowDrawn && { arrowPadding: POPOVER_ARROW_PADDING }),
      toView: ({ button, panel, backdrop, arrow, isVisible }) =>
        h.div(
          [h.Class(wrapperClassName)],
          [
            h.button(
              [...button, h.Class(triggerClassName)],
              [h.span([], ['Solutions'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class(backdropClassName)]),
                  h.div(
                    [...panel, h.Class(panelClassNames[panelVariant])],
                    [
                      ...(isArrowDrawn
                        ? [
                            h.svg(
                              [
                                ...arrow,
                                h.Class('popover-arrow'),
                                h.ViewBox('0 0 16 16'),
                              ],
                              [
                                h.path([
                                  h.Class('popover-arrow-fill'),
                                  h.D('M 0.5 8 L 8 0.5 L 15.5 8 V 10 H 0.5 Z'),
                                ]),
                                h.svg(
                                  [
                                    h.Class('popover-arrow-outline-clip'),
                                    h.Width('16'),
                                    h.Height('8'),
                                    h.ViewBox('0 0 16 8'),
                                  ],
                                  [
                                    h.path([
                                      h.Class('popover-arrow-outline'),
                                      h.D('M 0.5 8 L 8 0.5 L 15.5 8'),
                                    ]),
                                  ],
                                ),
                              ],
                            ),
                          ]
                        : []),
                      panelContent(),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: toMessage,
  })
}

const labeledPopoverDemo = (
  popoverModel: Popover.Model,
  toMessage: (message: Popover.Message) => Message,
  panelVariant: PanelVariant,
  h: HtmlBuilder<Message>,
): Array<Html> => [
  h.div(
    [h.Class('demo-field')],
    [
      h.label(
        [h.For(Popover.buttonId(popoverModel.id)), h.Class('demo-label')],
        ['Product menu'],
      ),
      h.div(
        [h.Class('relative')],
        [popoverDemo(popoverModel, toMessage, panelVariant, h)],
      ),
    ],
  ),
]

export const basicDemo = (
  popoverModel: Popover.Model,
  h: HtmlBuilder<Message>,
): Array<Html> =>
  labeledPopoverDemo(
    popoverModel,
    message => Message.GotPopoverBasicDemoMessage({ message }),
    'Basic',
    h,
  )

export const animatedDemo = (
  popoverModel: Popover.Model,
  h: HtmlBuilder<Message>,
): Array<Html> =>
  labeledPopoverDemo(
    popoverModel,
    message => Message.GotPopoverAnimatedDemoMessage({ message }),
    'Animated',
    h,
  )

export const arrowDemo = (
  popoverModel: Popover.Model,
  h: HtmlBuilder<Message>,
): Array<Html> =>
  labeledPopoverDemo(
    popoverModel,
    message => Message.GotPopoverArrowDemoMessage({ message }),
    'Arrow',
    h,
  )

const nestedChildPopover = (
  childPopoverModel: Popover.Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
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
                  h.div([...backdrop, h.Class(backdropClassName)]),
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
    toParentMessage: message =>
      Message.GotPopoverNestedChildDemoMessage({ message }),
  })

export const nestedDemo = (
  parentPopoverModel: Popover.Model,
  childPopoverModel: Popover.Model,
  h: HtmlBuilder<Message>,
) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [
            h.For(Popover.buttonId(parentPopoverModel.id)),
            h.Class('demo-label'),
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
                            h.div([...backdrop, h.Class(backdropClassName)]),
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
                                    nestedChildPopover(childPopoverModel, h),
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
                Message.GotPopoverNestedParentDemoMessage({ message }),
            }),
          ],
        ),
      ],
    ),
  ]
}

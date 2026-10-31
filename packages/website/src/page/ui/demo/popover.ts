import { type Html, inertHtml as ih } from 'foldkit/html'

import type { Popover } from '@foldkit/ui'
import {
  type AnchorConfig,
  type ViewInput,
  buttonId,
} from '@foldkit/ui/popover'

import type { UiViewBuilder } from '../definition'

type PopoverModel = Popover.Popover

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
        [ih.Class('text-sm text-gray-700 dark:text-gray-400')],
        ['Get a better understanding of where your traffic is coming from.'],
      ),
    ],
  )

const popoverViewInputs = (
  panelVariant: PanelVariant,
  h: UiViewBuilder,
): ViewInput => {
  const isArrowDrawn = panelVariant === 'Arrow'

  return {
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
  }
}

const labeledPopoverDemo = (
  popoverModel: PopoverModel,
  content: Html,
  h: UiViewBuilder,
): Array<Html> => [
  h.div(
    [h.Class('demo-field')],
    [
      h.label(
        [h.For(buttonId(popoverModel.model.id)), h.Class('demo-label')],
        ['Product menu'],
      ),
      h.div([h.Class('relative')], [content]),
    ],
  ),
]

export const basicDemo = (
  popoverModel: PopoverModel,
  h: UiViewBuilder,
): Array<Html> =>
  labeledPopoverDemo(
    popoverModel,
    popoverModel.view(popoverViewInputs('Basic', h)),
    h,
  )

export const animatedDemo = (
  popoverModel: PopoverModel,
  h: UiViewBuilder,
): Array<Html> =>
  labeledPopoverDemo(
    popoverModel,
    popoverModel.view(popoverViewInputs('Animated', h)),
    h,
  )

export const arrowDemo = (
  popoverModel: PopoverModel,
  h: UiViewBuilder,
): Array<Html> =>
  labeledPopoverDemo(
    popoverModel,
    popoverModel.view(popoverViewInputs('Arrow', h)),
    h,
  )

const nestedChildPopover = (
  childPopoverModel: PopoverModel,
  h: UiViewBuilder,
): Html =>
  childPopoverModel.view({
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
                      [h.Class('text-sm text-gray-700 dark:text-gray-400')],
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
  })

export const nestedDemo = (
  parentPopoverModel: PopoverModel,
  childPopoverModel: PopoverModel,
  h: UiViewBuilder,
) => {
  return [
    h.div(
      [h.Class('demo-field')],
      [
        h.label(
          [h.For(buttonId(parentPopoverModel.model.id)), h.Class('demo-label')],
          ['Account'],
        ),
        h.div(
          [h.Class('relative')],
          [
            parentPopoverModel.view({
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
                                        'text-sm text-gray-700 dark:text-gray-400',
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
            }),
          ],
        ),
      ],
    ),
  ]
}

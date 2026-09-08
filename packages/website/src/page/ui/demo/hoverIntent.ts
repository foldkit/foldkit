import type { Html, HtmlBuilder } from 'foldkit/html'

import { HoverIntent } from '@foldkit/ui'

import { Message } from '../message'

const triggerClassName =
  'button-accent inline-flex cursor-pointer items-center rounded-lg px-4 py-2 text-sm shadow-sm'

const cardPanelClassName =
  'absolute left-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900'

const menuPanelClassName =
  'absolute left-0 top-full z-10 mt-2 grid w-48 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900'

const menuItemClassName =
  'w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-accent-600 dark:text-gray-300 dark:hover:bg-gray-800'

const CARD_TRIGGER_ID = 'hover-intent-card-trigger'
const CARD_PANEL_ID = 'hover-intent-card-panel'
const MENU_TRIGGER_ID = 'hover-intent-menu-trigger'
const MENU_PANEL_ID = 'hover-intent-menu-panel'

const hoverCard = (
  { trigger, panel, isVisible }: HoverIntent.RenderInfo,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('relative')],
    [
      h.button(
        [
          ...trigger,
          h.Type('button'),
          h.Id(CARD_TRIGGER_ID),
          h.AriaControls(CARD_PANEL_ID),
          h.AriaExpanded(isVisible),
          h.Class(triggerClassName),
        ],
        ['More information'],
      ),
      ...(isVisible
        ? [
            h.div(
              [...panel, h.Id(CARD_PANEL_ID), h.Class(cardPanelClassName)],
              [
                h.h3(
                  [
                    h.Class(
                      'text-sm font-medium text-gray-900 dark:text-white',
                    ),
                  ],
                  ['Details'],
                ),
                h.p(
                  [
                    h.Class(
                      'mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400',
                    ),
                  ],
                  ['A short description can provide useful context.'],
                ),
              ],
            ),
          ]
        : []),
    ],
  )

export const hoverCardDemo = (
  hoverIntentCardDemo: HoverIntent.Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => [
  h.div(
    [h.Class('flex min-h-32 w-full items-center justify-center')],
    [
      h.submodel({
        slotId: 'hover-intent-card-demo',
        model: hoverIntentCardDemo,
        view: HoverIntent.view,
        viewInputs: {
          focusTriggerSelector: `#${CARD_TRIGGER_ID}`,
          toView: renderInfo => hoverCard(renderInfo, h),
        },
        toParentMessage: message =>
          Message.GotHoverIntentCardDemoMessage({ message }),
      }),
    ],
  ),
]

const hoverMenu = (
  { trigger, panel, isVisible }: HoverIntent.RenderInfo,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('relative')],
    [
      h.button(
        [
          ...trigger,
          h.Type('button'),
          h.Id(MENU_TRIGGER_ID),
          h.AriaControls(MENU_PANEL_ID),
          h.AriaExpanded(isVisible),
          h.Class(triggerClassName),
        ],
        ['Actions'],
      ),
      ...(isVisible
        ? [
            h.div(
              [...panel, h.Id(MENU_PANEL_ID), h.Class(menuPanelClassName)],
              [
                h.button(
                  [
                    h.Type('button'),
                    h.Class(menuItemClassName),
                    h.OnClick(Message.ClickedHoverIntentMenuItem()),
                  ],
                  ['Edit'],
                ),
                h.button(
                  [
                    h.Type('button'),
                    h.Class(menuItemClassName),
                    h.OnClick(Message.ClickedHoverIntentMenuItem()),
                  ],
                  ['Duplicate'],
                ),
                h.button(
                  [
                    h.Type('button'),
                    h.Class(menuItemClassName),
                    h.OnClick(Message.ClickedHoverIntentMenuItem()),
                  ],
                  ['Archive'],
                ),
              ],
            ),
          ]
        : []),
    ],
  )

export const hoverMenuDemo = (
  hoverIntentMenuDemo: HoverIntent.Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => [
  h.div(
    [h.Class('flex min-h-32 w-full items-center justify-center')],
    [
      h.submodel({
        slotId: 'hover-intent-menu-demo',
        model: hoverIntentMenuDemo,
        view: HoverIntent.view,
        viewInputs: {
          focusTriggerSelector: `#${MENU_TRIGGER_ID}`,
          toView: renderInfo => hoverMenu(renderInfo, h),
        },
        toParentMessage: message =>
          Message.GotHoverIntentMenuDemoMessage({ message }),
      }),
    ],
  ),
]

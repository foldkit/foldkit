import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { HoverIntent } from '@foldkit/ui'

import { Message as UiMessage } from '../message'
import type { UiModel } from '../model'

const triggerClassName =
  'inline-flex cursor-pointer items-center rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600'

const panelClassName =
  'absolute left-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg'

const TRIGGER_ID = 'hover-intent-showcase-trigger'
const PANEL_ID = 'hover-intent-showcase-panel'

export const view = Submodel.defineView<UiModel, UiMessage>((model, h): Html =>
  h.div(
    [],
    [
      h.h2(
        [h.Class('text-2xl font-bold text-gray-900 mb-6')],
        ['Hover Intent'],
      ),
      h.p(
        [h.Class('mb-4 max-w-xl text-sm text-gray-600')],
        [
          'Hover over or focus the “More information” trigger, then move the pointer into the card. Move the pointer or focus away from both elements, or press Escape, to close it.',
        ],
      ),
      h.submodel({
        slotId: 'hover-intent-showcase',
        model: model.hoverIntentDemo,
        view: HoverIntent.view,
        viewInputs: {
          focusTriggerSelector: `#${TRIGGER_ID}`,
          toView: ({ trigger, panel, isVisible }) =>
            h.div(
              [h.Class('relative inline-block')],
              [
                h.button(
                  [
                    ...trigger,
                    h.Type('button'),
                    h.Id(TRIGGER_ID),
                    h.AriaControls(PANEL_ID),
                    h.AriaExpanded(isVisible),
                    h.Class(triggerClassName),
                  ],
                  ['More information'],
                ),
                ...(isVisible
                  ? [
                      h.div(
                        [...panel, h.Id(PANEL_ID), h.Class(panelClassName)],
                        [
                          h.h3(
                            [h.Class('text-sm font-medium text-gray-900')],
                            ['Details'],
                          ),
                          h.p(
                            [h.Class('mt-1 text-sm leading-5 text-gray-600')],
                            ['A short description can provide useful context.'],
                          ),
                        ],
                      ),
                    ]
                  : []),
              ],
            ),
        },
        toParentMessage: message =>
          UiMessage.GotHoverIntentDemoMessage({ message }),
      }),
    ],
  ),
)

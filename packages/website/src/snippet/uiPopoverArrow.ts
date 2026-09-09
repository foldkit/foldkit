// Pseudocode walkthrough of what an arrow adds to a Popover you already have.
// Popover positions the arrow. The CSS below the demo draws it.
import type { HtmlBuilder } from 'foldkit/html'

import { Popover } from '@foldkit/ui'

const view = (h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'info',
    model: model.popover,
    view: Popover.view,
    viewInputs: {
      // Leave room for the arrow tip, which reaches 8px past the panel:
      anchor: { placement: 'bottom-start', gap: 10, padding: 8 },
      // Keep the arrow clear of the panel's rounded corners:
      arrowPadding: 12,
      // Take the arrow bundle from the render payload:
      toView: ({ button, panel, backdrop, arrow, isVisible }) =>
        h.div(
          [h.Class('relative inline-block')],
          [
            h.button(
              [
                ...button,
                h.Class('rounded-lg border px-3 py-2 cursor-pointer'),
              ],
              [h.span([], ['Solutions'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class('fixed inset-0')]),
                  h.div(
                    [
                      ...panel,
                      // The placement rules target the arrow through the
                      // panel, so the panel needs a class they can name:
                      h.Class(
                        'popover-panel rounded-lg border shadow-lg p-4 w-80',
                      ),
                    ],
                    [
                      // Spread the bundle onto your own element, inside the
                      // panel. The fill masks the panel border, while the
                      // nested SVG clips the outline at the panel edge:
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
                      h.h3([h.Class('font-medium')], ['Analytics']),
                      h.p(
                        [h.Class('text-sm text-gray-500')],
                        [
                          'Get a better understanding of where your traffic is coming from.',
                        ],
                      ),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message => Message.GotPopoverMessage({ message }),
  })

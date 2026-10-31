import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'

import { Popover } from '@foldkit/ui'
import type { RenderInfo as PopoverRenderInfo } from '@foldkit/ui/popover'
import { buttonId as PopoverButtonId } from '@foldkit/ui/popover'

export class Solutions extends Block<Solutions>()('Solutions', {
  Model: Schema.Struct({ popover: Popover.Popover }),
}) {}

export const SolutionsLive = Solutions.make(
  Effect.fn(function* () {
    const popover = yield* new Popover.Popover('popover', { id: 'info' })

    return {
      model: { popover },

      // Name the trigger with a native `<label for>` that targets
      // `buttonId('info')`, and pass `ariaLabelledBy` to the view
      view: (model, h) => {
        const labelId = 'info-label'

        const popoverView = ({
          button,
          panel,
          backdrop,
          isVisible,
        }: PopoverRenderInfo) =>
          h.div(
            [h.Class('relative inline-block')],
            [
              h.label(
                [h.Id(labelId), h.For(PopoverButtonId('info'))],
                ['Solutions'],
              ),
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
                        h.Class('rounded-lg border shadow-lg p-4 w-80'),
                      ],
                      [
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
          )

        return model.popover.view({
          ariaLabelledBy: labelId,
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
          toView: popoverView,
        })
      },
    }
  }),
).pipe(Layer.provide(Popover.PopoverLive))

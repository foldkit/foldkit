import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'

import { Tooltip } from '@foldkit/ui'
import type { RenderInfo as TooltipRenderInfo } from '@foldkit/ui/tooltip'

export class SaveButton extends Block<SaveButton>()('SaveButton', {
  Model: Schema.Struct({ tooltip: Tooltip.Tooltip }),
}) {}

export const SaveButtonLive = SaveButton.make(
  Effect.fn(function* () {
    const tooltip = yield* new Tooltip.Tooltip('tooltip', { id: 'save-button' })

    return {
      model: { tooltip },

      // The tooltip describes the trigger but does not name it, so give an
      // icon-only trigger an accessible name with `ariaLabel`
      view: (model, h) => {
        const tooltipView = ({
          trigger,
          panel,
          isVisible,
        }: TooltipRenderInfo) =>
          h.div(
            [h.Class('relative inline-block')],
            [
              h.button(
                [
                  ...trigger,
                  h.Class('rounded-lg border px-3 py-2 cursor-pointer'),
                ],
                // Icon-only content; `ariaLabel` above supplies the name.
                [h.span([h.AriaHidden(true)], ['💾'])],
              ),
              ...(isVisible
                ? [
                    h.div(
                      [
                        ...panel,
                        h.Class(
                          'rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white shadow-lg',
                        ),
                      ],
                      [h.span([], ['Save your changes (⌘S)'])],
                    ),
                  ]
                : []),
            ],
          )

        return model.tooltip.view({
          ariaLabel: 'Save',
          anchor: { placement: 'top', gap: 6, padding: 8 },
          toView: tooltipView,
        })
      },
    }
  }),
).pipe(Layer.provide(Tooltip.TooltipLive))

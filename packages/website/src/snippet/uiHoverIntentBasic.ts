import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'

import { HoverIntent } from '@foldkit/ui'
import type { RenderInfo as HoverIntentRenderInfo } from '@foldkit/ui/hoverIntent'

const triggerId = 'more-information-trigger'
const panelId = 'more-information-panel'

export class MoreInformation extends Block<MoreInformation>()(
  'MoreInformation',
  {
    Model: Schema.Struct({ hoverIntent: HoverIntent.HoverIntent }),
  },
) {}

export const MoreInformationLive = MoreInformation.make(
  Effect.fn(function* () {
    // This behavior primitive owns no DOM id
    const hoverIntent = yield* new HoverIntent.HoverIntent('hoverIntent', {
      openDelay: 200,
      closeDelay: 300,
    })

    return {
      model: { hoverIntent },

      // Spread each attribute bundle onto the element it names. HoverIntent
      // owns the interaction; this view owns the markup, semantics,
      // positioning, and styles.
      view: (model, h) => {
        const hoverIntentView = ({
          trigger,
          panel,
          isVisible,
        }: HoverIntentRenderInfo) =>
          h.div(
            [],
            [
              h.button(
                [
                  ...trigger,
                  h.Type('button'),
                  h.Id(triggerId),
                  h.AriaControls(panelId),
                  h.AriaExpanded(isVisible),
                ],
                ['More information'],
              ),
              ...(isVisible
                ? [
                    h.div(
                      [...panel, h.Id(panelId)],
                      [
                        h.p(
                          [],
                          ['A short description can provide useful context.'],
                        ),
                      ],
                    ),
                  ]
                : []),
            ],
          )

        return model.hoverIntent.view({
          focusTriggerSelector: `#${triggerId}`,
          toView: hoverIntentView,
        })
      },
    }
  }),
).pipe(Layer.provide(HoverIntent.HoverIntentLive))

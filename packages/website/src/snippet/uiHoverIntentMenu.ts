import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { HoverIntent } from '@foldkit/ui'
import type { RenderInfo as HoverIntentRenderInfo } from '@foldkit/ui/hoverIntent'

const Message = defineMessageUnion({
  ClickedHoverMenuItem: {},
})

const triggerId = 'actions-trigger'
const panelId = 'actions-panel'

export class HoverMenu extends Block<HoverMenu>()('HoverMenu', {
  Model: Schema.Struct({ hoverMenu: HoverIntent.HoverIntent }),
  Message,
}) {}

export const HoverMenuLive = HoverMenu.make(
  Effect.fn(function* () {
    const hoverMenu = yield* new HoverIntent.HoverIntent('hoverMenu', {})

    return {
      model: { hoverMenu },

      update: {
        // Close the menu immediately when any item is clicked
        ClickedHoverMenuItem: model => ({
          model,
          messages: [
            model.hoverMenu.send(
              HoverIntent.HoverIntent.Message.RequestedClose(),
            ),
          ],
        }),
      },

      view: (model, h) => {
        const hoverMenuView = ({
          trigger,
          panel,
          isVisible,
        }: HoverIntentRenderInfo) =>
          h.div(
            [h.Class('relative')],
            [
              h.button(
                [
                  ...trigger,
                  h.Type('button'),
                  h.Id(triggerId),
                  h.AriaControls(panelId),
                  h.AriaExpanded(isVisible),
                ],
                ['Actions'],
              ),
              ...(isVisible
                ? [
                    h.div(
                      [...panel, h.Id(panelId)],
                      [
                        h.button(
                          [
                            h.Type('button'),
                            h.OnClick(Message.ClickedHoverMenuItem()),
                          ],
                          ['Edit'],
                        ),
                        h.button(
                          [
                            h.Type('button'),
                            h.OnClick(Message.ClickedHoverMenuItem()),
                          ],
                          ['Duplicate'],
                        ),
                        h.button(
                          [
                            h.Type('button'),
                            h.OnClick(Message.ClickedHoverMenuItem()),
                          ],
                          ['Archive'],
                        ),
                      ],
                    ),
                  ]
                : []),
            ],
          )

        return model.hoverMenu.view({
          focusTriggerSelector: `#${triggerId}`,
          toView: hoverMenuView,
        })
      },
    }
  }),
).pipe(Layer.provide(HoverIntent.HoverIntentLive))

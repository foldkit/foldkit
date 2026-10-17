// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { HoverIntent } from '@foldkit/ui'
import type { RenderInfo as HoverIntentRenderInfo } from '@foldkit/ui/hoverIntent'

const Model = Schema.Struct({
  hoverMenu: HoverIntent.Model,
  // ...your other fields
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotHoverMenuMessage: { message: HoverIntent.Message },
  ClickedHoverMenuItem: {},
})
type Message = typeof Message.Type

const foldHoverMenuOutMessage = HoverIntent.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const HoverMenu = Block.define('HoverMenu', {
  Model,
  Message,
})

const HoverMenuBinding = HoverMenu.bindChild(HoverIntent.block, {
  field: 'hoverMenu',
  parentMessage: Message.GotHoverMenuMessage,
  init: true,
  outMessage: { fold: foldHoverMenuOutMessage },
})

const HoverMenuComposition = HoverMenu.makeComposition({
  childBindings: [HoverMenuBinding],
})

const init = HoverMenuComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

// Close the menu immediately when any item is clicked.

// In the corresponding Message.match handlers:
const update = HoverMenuComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedHoverMenuItem: () => HoverMenuBinding.close()(model),
  }),
)

const triggerId = 'actions-trigger'
const panelId = 'actions-panel'

const view = HoverMenuComposition.makeView((model, h) => {
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

  return h.block(
    HoverMenuBinding.embedView({
      slotId: 'hover-menu',
      model: model.hoverMenu,
      viewInputs: {
        focusTriggerSelector: `#${triggerId}`,
        toView: hoverMenuView,
      },
    }),
  )
})

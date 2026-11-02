import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { HoverIntent } from '@foldkit/ui'
import type { RenderInfo as HoverIntentRenderInfo } from '@foldkit/ui/hoverIntent'

const Model = Schema.Struct({
  hoverMenu: HoverIntent.HoverIntentBlock.Model,
  // ...your other fields
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedHoverMenuItem: {},
})
type Message = typeof Message.Type

const HoverMenuKey = Symbol('HoverMenu')

const HoverMenuDefinition = Block.makeDefinition('HoverMenu', {
  key: HoverMenuKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeNoopStep } = HoverMenuDefinition

const foldHoverMenuOutMessage = HoverMenuDefinition.makeOutMessageFold(
  HoverIntent.HoverIntentBlock,
  {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  },
)

const HoverMenuBinding = HoverMenuDefinition.makeBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hoverMenu',
  },
).withOutMessagePolicy({ fold: foldHoverMenuOutMessage })

const HoverMenuComposition = HoverMenuDefinition.makeComposition({
  bindings: [HoverMenuBinding],
})

const init = HoverMenuComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

// Close the menu immediately when any item is clicked.

// In the corresponding update handlers:
const update = HoverMenuComposition.makeUpdate({
  ClickedHoverMenuItem: model => HoverMenuBinding.requestClose()(model),
})

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

export const ApplicationBlock = HoverMenuDefinition.makeBlock(
  Effect.gen(function* () {
    const hoverMenu = yield* HoverMenuBinding
    return { children: [hoverMenu], init, update, view }
  }),
).provide(HoverIntent.layer)

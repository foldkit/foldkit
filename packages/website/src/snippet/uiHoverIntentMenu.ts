import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  HoverIntentBlock,
  layer as HoverIntentLayer,
  type RenderInfo as HoverIntentRenderInfo,
} from '@foldkit/ui/hoverIntent'

const Model = Schema.Struct({
  hoverMenu: HoverIntentBlock.Model,
  // ...your other fields
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedHoverMenuItem: {},
})
type Message = typeof Message.Type

export const HoverMenuKey = Symbol('HoverMenu')

export const HoverMenuBlock = Block.make('HoverMenu', {
  key: HoverMenuKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeNoopStep } = HoverMenuBlock

const foldHoverMenuOutMessage = HoverMenuBlock.makeOutMessageFold(
  HoverIntentBlock,
  {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  },
)

const HoverMenuBinding = HoverMenuBlock.makeBinding(HoverIntentBlock, {
  field: 'hoverMenu',
}).withOutMessagePolicy({ fold: foldHoverMenuOutMessage })

const HoverMenuComposition = HoverMenuBlock.makeComposition({
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

export const layer = HoverMenuBlock.makeLayer(
  Effect.gen(function* () {
    const hoverMenu = yield* HoverMenuBinding

    return {
      children: [hoverMenu],
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(HoverIntentLayer))

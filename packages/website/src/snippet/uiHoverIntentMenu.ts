import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { HoverIntent } from '@foldkit/ui'

const Model = Schema.Struct({
  hoverMenu: HoverIntent.HoverIntentBlock.Model,
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
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const {
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeComposition,
} = HoverMenuBlock

const HoverMenuBinding = makeRequiredFieldBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hoverMenu',
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(HoverIntent.HoverIntentBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  }),
})

const HoverMenuComposition = makeComposition({
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
  }: HoverIntent.RenderInfo) =>
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
    const children = yield* HoverMenuComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(HoverIntent.layer))

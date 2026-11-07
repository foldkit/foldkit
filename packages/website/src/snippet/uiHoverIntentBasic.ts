import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { HoverIntent } from '@foldkit/ui'

// Add a field to your Model:
const Model = Schema.Struct({
  hoverIntent: HoverIntent.HoverIntentBlock.Model,
  // ...your other fields
})
type Model = typeof Model.Type
// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

export const HoverIntentExampleKey = Symbol('HoverIntentExample')
export const HoverIntentExampleBlock = Block.make('HoverIntentExample', {
  key: HoverIntentExampleKey,
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
} = HoverIntentExampleBlock

const HoverIntentBinding = makeRequiredFieldBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hoverIntent',
    init: {
      contextToArgs: () => [{ openDelay: 200, closeDelay: 300 }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(HoverIntent.HoverIntentBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  }),
})

const HoverIntentExampleComposition = makeComposition({
  bindings: [HoverIntentBinding],
})

// Initialize it. This behavior primitive owns no DOM id:
const init = HoverIntentExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = HoverIntentExampleComposition.makeUpdate({})

// Spread each attribute bundle onto the element it names. HoverIntent owns the
// interaction; this view owns the markup, semantics, positioning, and styles.
const triggerId = 'more-information-trigger'
const panelId = 'more-information-panel'

const view = HoverIntentExampleComposition.makeView((model, h) => {
  const hoverIntentView = ({
    trigger,
    panel,
    isVisible,
  }: HoverIntent.RenderInfo) =>
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
                [h.p([], ['A short description can provide useful context.'])],
              ),
            ]
          : []),
      ],
    )

  return h.block(
    HoverIntentBinding.embedView({
      slotId: 'more-information',
      model: model.hoverIntent,
      viewInputs: {
        focusTriggerSelector: `#${triggerId}`,
        toView: hoverIntentView,
      },
    }),
  )
})

export const layer = HoverIntentExampleBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* HoverIntentExampleComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(HoverIntent.layer))

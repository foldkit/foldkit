// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { HoverIntent } from '@foldkit/ui'
import type { RenderInfo as HoverIntentRenderInfo } from '@foldkit/ui/hoverIntent'

// Add a field to your Model:
const Model = Schema.Struct({
  hoverIntent: HoverIntent.HoverIntentBlock.Model,
  // ...your other fields
})

// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})

const HoverIntentExampleDefinition = Block.makeDefinition(
  'HoverIntentExample',
  {
    Model,
    Message,
  },
)

const { makeNoopStep } = HoverIntentExampleDefinition

const foldHoverIntentOutMessage =
  HoverIntentExampleDefinition.makeOutMessageFold(
    HoverIntent.HoverIntentBlock,
    {
      Opened: makeNoopStep,
      Closed: makeNoopStep,
    },
  )

const HoverIntentBinding = HoverIntentExampleDefinition.makeBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hoverIntent',
    init: {
      contextToArgs: () => Tuple.make({ openDelay: 200, closeDelay: 300 }),
    },
  },
).withOutMessagePolicy({ fold: foldHoverIntentOutMessage })

const HoverIntentExampleComposition =
  HoverIntentExampleDefinition.makeComposition({
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

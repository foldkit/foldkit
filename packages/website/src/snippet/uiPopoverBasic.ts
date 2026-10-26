// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Popover } from '@foldkit/ui'
import type { RenderInfo as PopoverRenderInfo } from '@foldkit/ui/popover'
import { buttonId as PopoverButtonId } from '@foldkit/ui/popover'

// Add a field to your Model for the Popover Block:
const Model = Schema.Struct({
  popover: Popover.PopoverBlock.Model,
  // ...your other fields
})

// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})

const PopoverExampleDefinition = Block.makeDefinition('PopoverExample', {
  Model,
  Message,
})

const { makeNoopStep } = PopoverExampleDefinition

// At module scope, fold the OutMessage into your own Model. `Opened` and
// `Closed` mark the visibility transitions. Fire analytics, coordinate with
// other UI, or clear ephemeral state on close. Each arm returns an
// parent Step over the Model that already has the next Popover Model written
// back. The parent Definition checks every named variant:
const foldPopoverOutMessage = PopoverExampleDefinition.makeOutMessageFold(
  Popover.PopoverBlock,
  {
    // The child has emitted `Opened`. In this arm the parent can update its
    // own state or dispatch its own Commands, for example lazy-load panel
    // content, log analytics, or trigger a downstream Command.
    Opened: makeNoopStep,
    // The child has emitted `Closed`. In this arm the parent can update its
    // own state or dispatch its own Commands, for example persist a draft,
    // clear ephemeral state, or trigger a downstream Command.
    Closed: makeNoopStep,
  },
)

// The Binding wires the completed child Block into the parent: it runs Popover.PopoverBlock.update,
// writes the next Popover Model back, routes generated delivery and Command
// results, and hands any OutMessage to the OutMessage fold.
const PopoverBinding = PopoverExampleDefinition.makeBinding(
  Popover.PopoverBlock,
  {
    field: 'popover',
    init: { contextToArgs: () => Tuple.make({ id: 'info' }) },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

const PopoverExampleComposition = PopoverExampleDefinition.makeComposition({
  bindings: [PopoverBinding],
})

// In your init function, initialize the Popover Block with a unique id:
const init = PopoverExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = PopoverExampleComposition.makeUpdate({})

// Inside your view function, embed the popover via h.block. Give the
// trigger an accessible name: target the trigger id with
// `buttonId('info')` from `@foldkit/ui/popover` from a native `<label for>`, and pass
// `ariaLabelledBy` so the trigger is named by the label. The attribute is
// only emitted when provided, so the trigger never carries a dangling
// `aria-labelledby`.
const view = PopoverExampleComposition.makeView((model, h) => {
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
        h.label([h.Id(labelId), h.For(PopoverButtonId('info'))], ['Solutions']),
        h.button(
          [...button, h.Class('rounded-lg border px-3 py-2 cursor-pointer')],
          [h.span([], ['Solutions'])],
        ),
        ...(isVisible
          ? [
              h.div([...backdrop, h.Class('fixed inset-0')]),
              h.div(
                [...panel, h.Class('rounded-lg border shadow-lg p-4 w-80')],
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

  return h.block(
    PopoverBinding.embedView({
      slotId: 'info',
      model: model.popover,
      viewInputs: {
        ariaLabelledBy: labelId,
        anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        toView: popoverView,
      },
    }),
  )
})

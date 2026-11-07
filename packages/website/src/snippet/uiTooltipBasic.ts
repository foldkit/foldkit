import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Tooltip } from '@foldkit/ui'

// Add a field to your Model for the Tooltip Block:
const Model = Schema.Struct({
  tooltip: Tooltip.TooltipBlock.Model,
  // ...your other fields
})
type Model = typeof Model.Type
// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

export const TooltipExampleKey = Symbol('TooltipExample')
export const TooltipExampleBlock = Block.make('TooltipExample', {
  key: TooltipExampleKey,
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
} = TooltipExampleBlock

// At module scope, fold the OutMessage into your own Model. `Shown` and
// `Hidden` mark the visibility transitions. Fire analytics or coordinate with
// the rest of your UI from the parent. Each arm returns an Update.Step over
// the parent Model, which already has the next Tooltip Model written back.
// The parent Block checks every named child variant:
// The Binding declares placement, typed startup, and OutMessage policy.
// The construction Layer below supplies the child implementation.
const TooltipBinding = makeRequiredFieldBinding(Tooltip.TooltipBlock, {
  field: 'tooltip',
  init: { contextToArgs: () => [{ id: 'save-button' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Tooltip.TooltipBlock, {
    // The child has emitted `Shown`. In this arm the parent can update its
    // own state or dispatch its own Commands, for example log analytics,
    // prefetch content, or trigger a downstream Command.
    Shown: makeNoopStep,
    // The child has emitted `Hidden`. In this arm the parent can update its
    // own state or dispatch its own Commands, for example clear ephemeral
    // state, fire analytics, or trigger a downstream Command.
    Hidden: makeNoopStep,
  }),
})

const TooltipExampleComposition = makeComposition({
  bindings: [TooltipBinding],
})

// In your init function, initialize the Tooltip Block with a unique id:
const init = TooltipExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = TooltipExampleComposition.makeUpdate({})

// Inside your view function, embed the tooltip via h.block. The tooltip
// describes the trigger but does not name it, so give an icon-only trigger
// an accessible name with `ariaLabel`. (Point `ariaLabelledBy` at a visible
// label element instead when one exists.) The attribute is only emitted when
// provided, so the trigger never carries a dangling `aria-labelledby`.
const view = TooltipExampleComposition.makeView((model, h) => {
  const tooltipView = ({ trigger, panel, isVisible }: Tooltip.RenderInfo) =>
    h.div(
      [h.Class('relative inline-block')],
      [
        h.button(
          [...trigger, h.Class('rounded-lg border px-3 py-2 cursor-pointer')],
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

  return h.block(
    TooltipBinding.embedView({
      slotId: 'save-button',
      model: model.tooltip,
      viewInputs: {
        ariaLabel: 'Save',
        anchor: { placement: 'top', gap: 6, padding: 8 },
        toView: tooltipView,
      },
    }),
  )
})

export const layer = TooltipExampleBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* TooltipExampleComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(Tooltip.layer))

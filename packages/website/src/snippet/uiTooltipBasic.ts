// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Tooltip } from '@foldkit/ui'
import type { RenderInfo as TooltipRenderInfo } from '@foldkit/ui/tooltip'

// Add a field to your Model for the Tooltip Block:
const Model = Schema.Struct({
  tooltip: Tooltip.Model,
  // ...your other fields
})
type Model = typeof Model.Type

// Embed the Tooltip Message in your parent Message:
const Message = defineMessageUnion({
  GotTooltipMessage: { message: Tooltip.Message },
})
type Message = typeof Message.Type

// At module scope, fold the OutMessage into your own Model. `Shown` and
// `Hidden` mark the visibility transitions. Fire analytics or coordinate with
// the rest of your UI from the parent. Each arm returns an Update.Step over
// the parent Model, which already has the next Tooltip Model written back:
const foldTooltipOutMessage = Tooltip.OutMessage.match<
  Update.Step<Model, Message>
>({
  // The child has emitted `Shown`. In this arm the parent can update its
  // own state or dispatch its own Commands, for example log analytics,
  // prefetch content, or trigger a downstream Command.
  Shown: () => model => ({ model }),
  // The child has emitted `Hidden`. In this arm the parent can update its
  // own state or dispatch its own Commands, for example clear ephemeral
  // state, fire analytics, or trigger a downstream Command.
  Hidden: () => model => ({ model }),
})

// The Binding wires the completed child Block into the parent: it runs Tooltip.update,
// writes the next Tooltip Model back, maps the Block's Commands into your
// Message type, and hands any OutMessage to the OutMessage fold.
const TooltipExample = Block.define('TooltipExample', {
  Model,
  Message,
})

const TooltipBinding = TooltipExample.bindChild(Tooltip.block, {
  field: 'tooltip',
  parentMessage: Message.GotTooltipMessage,
  init: { args: () => Tuple.make({ id: 'save-button' }) },
  outMessage: { fold: foldTooltipOutMessage },
})

const TooltipExampleComposition = TooltipExample.makeComposition({
  childBindings: [TooltipBinding],
})

// In your init function, initialize the Tooltip Block with a unique id:
const init = TooltipExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = TooltipExampleComposition.makeUpdate()

// Inside your view function, embed the tooltip via h.block. The tooltip
// describes the trigger but does not name it, so give an icon-only trigger
// an accessible name with `ariaLabel`. (Point `ariaLabelledBy` at a visible
// label element instead when one exists.) The attribute is only emitted when
// provided, so the trigger never carries a dangling `aria-labelledby`.
const view = TooltipExampleComposition.makeView((model, h) => {
  const tooltipView = ({ trigger, panel, isVisible }: TooltipRenderInfo) =>
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

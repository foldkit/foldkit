// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Tooltip } from '@foldkit/ui'

// Add a field to your Model for the Tooltip Submodel:
const Model = S.Struct({
  tooltip: Tooltip.Model,
  // ...your other fields
})

// In your init function, initialize the Tooltip Submodel with a unique id:
const init = () => [
  {
    tooltip: Tooltip.init({ id: 'save-button' }),
    // ...your other fields
  },
  [],
]

// Embed the Tooltip Message in your parent Message:
const GotTooltipMessage = m('GotTooltipMessage', {
  message: Tooltip.Message,
})

// At module scope, fold the OutMessage into your own Model. `Shown` and
// `Hidden` mark the visibility transitions. Fire analytics or coordinate with
// the rest of your UI from the parent. Each arm returns an Update.Step over
// the parent Model, which already has the next Tooltip Model written back:
const foldTooltipOutMessage = M.type<Tooltip.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    // The child has emitted `Shown`. In this arm the parent can update its
    // own state or dispatch its own Commands, for example log analytics,
    // prefetch content, or trigger a downstream Command.
    Shown: () => model => [model, []],
    // The child has emitted `Hidden`. In this arm the parent can update its
    // own state or dispatch its own Commands, for example clear ephemeral
    // state, fire analytics, or trigger a downstream Command.
    Hidden: () => model => [model, []],
  }),
)

// Update.foldChild wires the child into the parent: it runs Tooltip.update,
// writes the next Tooltip Model back, maps the Submodel's Commands into your
// Message type, and hands any OutMessage to foldOutMessage.
const foldTooltip = Update.foldChild({
  update: Tooltip.update,
  read: (model: Model) => Option.some(model.tooltip),
  write: (model, nextTooltip) => evo(model, { tooltip: () => nextTooltip }),
  toParentMessage: message => GotTooltipMessage({ message }),
  foldOutMessage: foldTooltipOutMessage,
})

// Inside your update function's M.tagsExhaustive({...}), call the fold:
GotTooltipMessage: ({ message }) => foldTooltip(model, message)

// Inside your view function, embed the tooltip via h.submodel. The tooltip
// describes the trigger but does not name it, so give an icon-only trigger
// an accessible name with `ariaLabel`. (Point `ariaLabelledBy` at a visible
// label element instead when one exists.) The attribute is only emitted when
// provided, so the trigger never carries a dangling `aria-labelledby`.
const view = (h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'save-button',
    model: model.tooltip,
    view: Tooltip.view,
    viewInputs: {
      ariaLabel: 'Save',
      anchor: { placement: 'top', gap: 6, padding: 8 },
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [h.Class('relative inline-block')],
          [
            h.button(
              [
                ...trigger,
                h.Class('rounded-lg border px-3 py-2 cursor-pointer'),
              ],
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
        ),
    },
    toParentMessage: message => GotTooltipMessage({ message }),
  })

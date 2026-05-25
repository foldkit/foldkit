// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the Tooltip Submodel:
const Model = S.Struct({
  tooltip: Ui.Tooltip.Model,
  // ...your other fields
})

// In your init function, initialize the Tooltip Submodel with a unique id:
const init = () => [
  {
    tooltip: Ui.Tooltip.init({ id: 'save-button' }),
    // ...your other fields
  },
  [],
]

// Embed the Tooltip Message in your parent Message:
const GotTooltipMessage = m('GotTooltipMessage', {
  message: Ui.Tooltip.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Ui.Tooltip.update. The OutMessages `Shown` and `Hidden` mark the
// visibility transitions. Fire analytics or coordinate with the rest
// of your UI from the parent.
GotTooltipMessage: ({ message }) => {
  const [nextTooltip, commands, maybeOutMessage] = Ui.Tooltip.update(
    model.tooltip,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotTooltipMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { tooltip: () => nextTooltip }), mappedCommands],
    onSome: M.type<Ui.Tooltip.OutMessage>().pipe(
      M.tagsExhaustive({
        Shown: () => [
          // The child has emitted `Shown`. The body commits the
          // child's next state as usual. In this arm the parent can
          // also update its own state or dispatch its own Commands,
          // for example log analytics, prefetch content, or trigger
          // a downstream Command.
          evo(model, { tooltip: () => nextTooltip }),
          mappedCommands,
        ],
        Hidden: () => [
          // The child has emitted `Hidden`. The body commits the
          // child's next state as usual. In this arm the parent can
          // also update its own state or dispatch its own Commands,
          // for example clear ephemeral state, fire analytics, or
          // trigger a downstream Command.
          evo(model, { tooltip: () => nextTooltip }),
          mappedCommands,
        ],
      }),
    ),
  })
}

// Inside your view function, embed the tooltip via h.submodel:
const view = () => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'save-button',
    model: model.tooltip,
    view: Ui.Tooltip.view,
    viewInputs: {
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
              [h.span([], ['Save'])],
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
}

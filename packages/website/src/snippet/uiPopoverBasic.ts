// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the Popover Submodel:
const Model = S.Struct({
  popover: Ui.Popover.Model,
  // ...your other fields
})

// In your init function, initialize the Popover Submodel with a unique id:
const init = () => [
  {
    popover: Ui.Popover.init({ id: 'info' }),
    // ...your other fields
  },
  [],
]

// Embed the Popover Message in your parent Message:
const GotPopoverMessage = m('GotPopoverMessage', {
  message: Ui.Popover.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Ui.Popover.update. The OutMessages `Opened` and `Closed` mark the
// visibility transitions. Fire analytics, coordinate with other UI,
// or clear ephemeral state on close.
GotPopoverMessage: ({ message }) => {
  const [nextPopover, commands, maybeOutMessage] = Ui.Popover.update(
    model.popover,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotPopoverMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { popover: () => nextPopover }), mappedCommands],
    onSome: M.type<Ui.Popover.OutMessage>().pipe(
      M.tagsExhaustive({
        Opened: () => [
          // The child has emitted `Opened`. The body commits the
          // child's next state as usual. In this arm the parent can
          // also update its own state or dispatch its own Commands,
          // for example lazy-load panel content, log analytics, or
          // trigger a downstream Command.
          evo(model, { popover: () => nextPopover }),
          mappedCommands,
        ],
        Closed: () => [
          // The child has emitted `Closed`. The body commits the
          // child's next state as usual. In this arm the parent can
          // also update its own state or dispatch its own Commands,
          // for example persist a draft, clear ephemeral state, or
          // trigger a downstream Command.
          evo(model, { popover: () => nextPopover }),
          mappedCommands,
        ],
      }),
    ),
  })
}

// Inside your view function, embed the popover via h.submodel:
const view = () => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'info',
    model: model.popover,
    view: Ui.Popover.view,
    viewInputs: {
      anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [h.Class('relative inline-block')],
          [
            h.button(
              [
                ...button,
                h.Class('rounded-lg border px-3 py-2 cursor-pointer'),
              ],
              [h.span([], ['Solutions'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class('fixed inset-0')], []),
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
        ),
    },
    toParentMessage: message => GotPopoverMessage({ message }),
  })
}

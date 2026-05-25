// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the Disclosure Submodel:
const Model = S.Struct({
  disclosure: Ui.Disclosure.Model,
  // ...your other fields
})

// In your init function, initialize the Disclosure Submodel with a unique id:
const init = () => [
  {
    disclosure: Ui.Disclosure.init({ id: 'faq-1' }),
    // ...your other fields
  },
  [],
]

// Embed the Disclosure Message in your parent Message:
const GotDisclosureMessage = m('GotDisclosureMessage', {
  message: Ui.Disclosure.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Ui.Disclosure.update. The OutMessage's `ToggledOpenState` fires on each
// open / close transition with the new `isOpen`. Useful for analytics
// or coordinated UI changes.
GotDisclosureMessage: ({ message }) => {
  const [nextDisclosure, commands, maybeOutMessage] = Ui.Disclosure.update(
    model.disclosure,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotDisclosureMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { disclosure: () => nextDisclosure }),
      mappedCommands,
    ],
    onSome: M.type<Ui.Disclosure.OutMessage>().pipe(
      M.tagsExhaustive({
        ToggledOpenState: ({ isOpen }) => [
          // The child has emitted `ToggledOpenState`. The body commits
          // the child's next state as usual. In this arm the parent
          // can also update its own state or dispatch its own
          // Commands, for example persist the open state, lazy-load
          // panel content, or log analytics.
          evo(model, { disclosure: () => nextDisclosure }),
          mappedCommands,
        ],
      }),
    ),
  })
}

// Inside your view function, embed the disclosure via h.submodel:
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'faq-1',
    model: model.disclosure,
    view: Ui.Disclosure.view,
    viewInputs: {
      toView: attributes =>
        h.div(
          [],
          [
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'flex items-center justify-between w-full p-4 border rounded-lg data-[open]:rounded-b-none',
                ),
              ],
              [h.span([], ['What is Foldkit?'])],
            ),
            model.disclosure.isOpen
              ? h.div(
                  [
                    ...attributes.panel,
                    h.Class('p-4 border-x border-b rounded-b-lg'),
                  ],
                  [h.p([], ['A functional UI framework built on Effect-TS.'])],
                )
              : h.empty,
          ],
        ),
    },
    toParentMessage: message => GotDisclosureMessage({ message }),
  })
}

// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Disclosure } from '@foldkit/ui'

// Add a field to your Model for the Disclosure Submodel:
const Model = S.Struct({
  disclosure: Disclosure.Model,
  // ...your other fields
})

// In your init function, initialize the Disclosure Submodel with a unique id:
const init = () => [
  {
    disclosure: Disclosure.init({ id: 'faq-1' }),
    // ...your other fields
  },
  [],
]

// Embed the Disclosure Message in your parent Message:
const GotDisclosureMessage = m('GotDisclosureMessage', {
  message: Disclosure.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// Disclosure.update. The OutMessage's `ToggledOpenState` fires on each
// open / close transition with the new `isOpen`. Useful for analytics
// or coordinated UI changes.
GotDisclosureMessage: ({ message }) => {
  const [nextDisclosure, commands, maybeOutMessage] = Disclosure.update(
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
    onSome: M.type<Disclosure.OutMessage>().pipe(
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

// Inside your view function, embed the disclosure via h.submodel. The toggle
// text below names the button. When the toggle is icon-only, give it a name
// with `ariaLabel`, or point `ariaLabelledBy` at a visible label element
// (target the toggle id with `Disclosure.buttonId('faq-1')` for a native
// `<label for>`). Either attribute is only emitted when provided, so the
// toggle never carries a dangling `aria-labelledby`.
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'faq-1',
    model: model.disclosure,
    view: Disclosure.view,
    viewInputs: {
      // ariaLabel: 'What is Foldkit?',
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

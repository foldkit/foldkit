// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Disclosure } from '@foldkit/ui'

// Store the open state as a plain boolean field in your Model:
const Model = S.Struct({
  isFaqOpen: S.Boolean,
  // ...your other fields
})

// In your init function, start it closed:
const init = () => [
  {
    isFaqOpen: false,
    // ...your other fields
  },
  [],
]

// A verb-first, past-tense Message carries the new open state:
const ToggledFaq = m('ToggledFaq', { isOpen: S.Boolean })

// Inside your update function's M.tagsExhaustive({...}), store the value.
// This is the moment to persist the open state, lazy-load panel content, or
// log analytics.
ToggledFaq: ({ isOpen }) => [evo(model, { isFaqOpen: () => isOpen }), []]

// Inside your view function, render the disclosure with Disclosure.view. The
// toggle text below names the button. When the toggle is icon-only, give it a
// name with `ariaLabel`, or point `ariaLabelledBy` at a visible label element
// (target the toggle id with `Disclosure.buttonId('faq-1')` for a native
// `<label for>`). Either attribute is only emitted when provided, so the
// toggle never carries a dangling `aria-labelledby`.
const view = (model: Model) => {
  const h = html<Message>()

  return Disclosure.view<Message>({
    id: 'faq-1',
    isOpen: model.isFaqOpen,
    onToggle: isOpen => ToggledFaq({ isOpen }),
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
          model.isFaqOpen
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
  })
}

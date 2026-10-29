// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Disclosure } from '@foldkit/ui'

// Store the open state as a plain boolean field in your Model:
const Model = Schema.Struct({
  isFaqOpen: Schema.Boolean,
  // ...your other fields
})
type Model = typeof Model.Type
// A verb-first, past-tense Message carries the new open state:

const Message = defineMessageUnion({
  ToggledFaq: { isOpen: Schema.Boolean },
})
type Message = typeof Message.Type

const FrequentlyAskedQuestionsComposition = Block.makeDefinition(
  'FrequentlyAskedQuestions',
  {
    Model,
    Message,
  },
).makeComposition()

// In your init function, start it closed:
const init = FrequentlyAskedQuestionsComposition.makeInit(() => ({
  model: {
    isFaqOpen: false,
    // ...your other fields
  },
}))

// In the corresponding update handler, store the value. Return Commands
// to persist the open state, load panel content, or record analytics.
const update = FrequentlyAskedQuestionsComposition.makeUpdate({
  ToggledFaq: (model, { isOpen }) => ({
    model: modifyFields(model, { isFaqOpen: () => isOpen }),
  }),
})

// Inside your view function, render the disclosure with Disclosure.view.
// Render the panel unconditionally and pass it through animatePanel: the
// panel stays mounted while collapsed, so the height transition animates the
// open and close. The toggle text below names the button. When the toggle is
// icon-only, give it a name with `ariaLabel`, or point `ariaLabelledBy` at a
// visible label element (target the toggle id with
// `Disclosure.buttonId('faq-1')` for a native `<label for>`). Either
// attribute is only emitted when provided, so the toggle never carries a
// dangling `aria-labelledby`.
const view = FrequentlyAskedQuestionsComposition.makeView((model, h) => {
  const disclosureView = ({
    button,
    panel,
    animatePanel,
  }: Disclosure.DisclosureAttributes<Message>) =>
    h.div(
      [h.Class('border rounded-lg overflow-hidden')],
      [
        h.button(
          [...button, h.Class('flex items-center justify-between w-full p-4')],
          [h.span([], ['What is Foldkit?'])],
        ),
        animatePanel(
          h.div(
            [...panel, h.Class('p-4 border-t')],
            [h.p([], ['A functional UI framework built on Effect-TS.'])],
          ),
        ),
      ],
    )

  return Disclosure.view(
    {
      id: 'faq-1',
      isOpen: model.isFaqOpen,
      onToggle: isOpen => Message.ToggledFaq({ isOpen }),
      toView: disclosureView,
    },
    h,
  )
})

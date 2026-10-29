// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Checkbox } from '@foldkit/ui'

// Store the checked state as a plain boolean field in your Model:
const Model = Schema.Struct({
  acceptedTerms: Schema.Boolean,
  // ...your other fields
})
type Model = typeof Model.Type
// A verb-first, past-tense Message carries the new checked state:

const Message = defineMessageUnion({
  ToggledTerms: { isChecked: Schema.Boolean },
})
type Message = typeof Message.Type

const TermsFormComposition = Block.makeDefinition('TermsForm', {
  Model,
  Message,
}).makeComposition()

// In your init function, start it unchecked:
const init = TermsFormComposition.makeInit(() => ({
  model: {
    acceptedTerms: false,
    // ...your other fields
  },
}))

// In the corresponding update handler, store the value. Pure form
// validation can stay in update; return Commands for analytics or backend work.
const update = TermsFormComposition.makeUpdate({
  ToggledTerms: (model, { isChecked }) => ({
    model: modifyFields(model, { acceptedTerms: () => isChecked }),
  }),
})

// Inside your view function, render the checkbox with Checkbox.view. It reads
// the checked state from your Model and calls onToggle with the new state.
const view = TermsFormComposition.makeView((model, h) => {
  const checkboxView = (attributes: Checkbox.CheckboxAttributes<Message>) =>
    h.div(
      [h.Class('flex flex-col gap-1')],
      [
        h.div(
          [h.Class('flex items-center gap-2')],
          [
            h.button(
              [...attributes.checkbox, h.Class('h-5 w-5 rounded border')],
              model.acceptedTerms ? ['✓'] : [],
            ),
            h.label(
              [...attributes.label, h.Class('text-sm')],
              ['Accept terms and conditions'],
            ),
          ],
        ),
        h.p(
          [...attributes.description, h.Class('text-sm text-gray-500')],
          ['You agree to our Terms of Service.'],
        ),
      ],
    )

  return Checkbox.view(
    {
      id: 'accept-terms',
      isChecked: model.acceptedTerms,
      hasDescription: true,
      onToggle: isChecked => Message.ToggledTerms({ isChecked }),
      toView: checkboxView,
    },
    h,
  )
})

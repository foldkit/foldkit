// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Checkbox } from '@foldkit/ui'

// Store the checked state as a plain boolean field in your Model:
const Model = S.Struct({
  acceptedTerms: S.Boolean,
  // ...your other fields
})

// In your init function, start it unchecked:
const init = () => [
  {
    acceptedTerms: false,
    // ...your other fields
  },
  [],
]

// A verb-first, past-tense Message carries the new checked state:
const ToggledTerms = m('ToggledTerms', { isChecked: S.Boolean })

const Message = S.Union([ToggledTerms])

// Inside your update function's M.tagsExhaustive({...}), store the value.
// This is the moment to fire analytics, validate a form, or push the value
// to a backend.
ToggledTerms: ({ isChecked }) => [
  evo(model, { acceptedTerms: () => isChecked }),
  [],
]

// Inside your view function, render the checkbox with Checkbox.view. It reads
// the checked state from your Model and calls onToggle with the new state.
const view = model => {
  const h = html<Message>()

  return Checkbox.view<Message>({
    id: 'accept-terms',
    isChecked: model.acceptedTerms,
    onToggle: isChecked => ToggledTerms({ isChecked }),
    toView: attributes =>
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
      ),
  })
}

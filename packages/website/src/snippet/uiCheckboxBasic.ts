import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Checkbox } from '@foldkit/ui'

const Message = defineMessageUnion({
  ToggledTerms: { isChecked: Schema.Boolean },
})
type Message = typeof Message.Type

export class TermsForm extends Block<TermsForm>()('TermsForm', {
  Model: Schema.Struct({
    acceptedTerms: Schema.Boolean,
  }),
  Message,
}) {}

export const TermsFormLive = TermsForm.make(
  Effect.fn(function* () {
    return {
      model: { acceptedTerms: false },

      update: {
        // Store the value. Pure form validation can stay in update; return
        // Commands for analytics or backend work.
        ToggledTerms: (model, { isChecked }) => ({
          model: modifyFields(model, { acceptedTerms: () => isChecked }),
        }),
      },

      // Checkbox.view reads the checked state from your Model and calls
      // onToggle with the new state
      view: (model, h) => {
        const checkboxView = (
          attributes: Checkbox.CheckboxAttributes<Message>,
        ) =>
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
      },
    }
  }),
)

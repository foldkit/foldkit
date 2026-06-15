// Pseudocode — Fieldset is view-only. Setting isDisabled on the fieldset
// propagates to all child form elements via the native <fieldset disabled>
// attribute.
import { Fieldset } from '@foldkit/ui'
import { html } from 'foldkit/html'

const view = () => {
  const h = html<Message>()

  return Fieldset.view({
    id: 'personal-info-disabled',
    isDisabled: true,
    toView: attributes =>
      h.fieldset(
        [...attributes.fieldset, h.Class('rounded-lg border p-6')],
        [
          h.legend(
            [...attributes.legend, h.Class('text-base font-semibold')],
            ['Personal Information'],
          ),
          h.span(
            [...attributes.description, h.Class('text-sm text-gray-500 mt-1')],
            ['This section is disabled.'],
          ),
          // All nested form controls inherit the disabled state
        ],
      ),
  })
}

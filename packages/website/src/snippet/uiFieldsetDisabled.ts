// Pseudocode — Fieldset is view-only. Setting isDisabled on the fieldset
// propagates to all child form elements via the native <fieldset disabled>
// attribute.
import { Ui } from 'foldkit'

import { Class, fieldset, legend, span } from './html'

Ui.Fieldset.view({
  id: 'personal-info-disabled',
  isDisabled: true,
  toView: attributes =>
    fieldset(
      [...attributes.fieldset, Class('rounded-lg border p-6')],
      [
        legend(
          [...attributes.legend, Class('text-base font-semibold')],
          ['Personal Information'],
        ),
        span(
          [...attributes.description, Class('text-sm text-gray-500 mt-1')],
          ['This section is disabled.'],
        ),
        // All nested form controls inherit the disabled state
      ],
    ),
})

import { Ui } from 'foldkit'

import { Class, div, fieldset, legend, span } from './html'

Ui.Fieldset.view({
  id: 'personal-info',
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
          ['We just need a few details.'],
        ),
        div(
          [Class('mt-4 flex flex-col gap-4')],
          [
            // Nest Input, Textarea, Checkbox, etc. here
          ],
        ),
      ],
    ),
})

// Pseudocode — Select is view-only. The selected value lives in your own
// Model as a string. Replace model.country and UpdatedCountry with your
// own field and Message.
import { Ui } from 'foldkit'

import { Class, Value, div, label, option, select, span } from './html'

Ui.Select.view({
  id: 'country',
  value: model.country, // your Model field
  onChange: value => UpdatedCountry({ value }), // your Message
  toView: attributes =>
    div(
      [Class('flex flex-col gap-1.5')],
      [
        label([...attributes.label, Class('text-sm font-medium')], ['Country']),
        select(
          [...attributes.select, Class('w-full rounded-lg border px-3 py-2')],
          [
            option([Value('us')], ['United States']),
            option([Value('ca')], ['Canada']),
            option([Value('gb')], ['United Kingdom']),
          ],
        ),
        span(
          [...attributes.description, Class('text-sm text-gray-500')],
          ['Where you currently reside.'],
        ),
      ],
    ),
})

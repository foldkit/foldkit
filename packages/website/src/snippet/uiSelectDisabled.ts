// Pseudocode — Select is view-only. Disabled selects display a fixed value
// and ignore onChange events.
import { Ui } from 'foldkit'

import { Class, Value, label, option, select, span } from './html'

Ui.Select.view({
  id: 'country-disabled',
  isDisabled: true,
  value: 'us',
  toView: attributes =>
    div(
      [Class('flex flex-col gap-1.5')],
      [
        label([...attributes.label, Class('text-sm font-medium')], ['Country']),
        select(
          [
            ...attributes.select,
            Class(
              'w-full rounded-lg border px-3 py-2 data-[disabled]:opacity-50',
            ),
          ],
          [
            option([Value('us')], ['United States']),
            option([Value('ca')], ['Canada']),
          ],
        ),
        span(
          [...attributes.description, Class('text-sm text-gray-500')],
          ['This select is disabled.'],
        ),
      ],
    ),
})

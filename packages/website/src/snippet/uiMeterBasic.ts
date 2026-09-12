// Pseudocode — Meter is view-only, read-only value display. Replace values with
// your own Model fields.
import type { HtmlBuilder } from 'foldkit/html'

import { Meter } from '@foldkit/ui'

const view = (h: HtmlBuilder<Message>) =>
  Meter.view(
    {
      id: 'health',
      value: 75,
      max: 100,
      ariaLabel: 'Health',
      valueText: '75 of 100 health',
      toView: attributes =>
        h.div(
          [...attributes.meter, h.Class('h-3 w-full rounded-full bg-gray-200')],
          [
            h.div([
              ...attributes.fill,
              h.Class('h-full rounded-full bg-emerald-600'),
            ]),
          ],
        ),
    },
    h,
  )

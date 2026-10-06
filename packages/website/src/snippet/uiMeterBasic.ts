import type { HtmlBuilder } from 'foldkit/html'

import { Meter } from '@foldkit/ui'

const view = (h: HtmlBuilder<Message>) => {
  const meterView = (attributes: Meter.MeterAttributes<Message>) =>
    h.div(
      [h.Class('flex flex-col gap-2')],
      [
        h.span([...attributes.label], ['Health']),
        h.div(
          [...attributes.meter, h.Class('h-3 w-full rounded-full bg-gray-200')],
          [
            h.div([
              ...attributes.fill,
              h.Class('h-full rounded-full bg-emerald-600'),
            ]),
          ],
        ),
      ],
    )

  return Meter.view(
    {
      id: 'health',
      value: 75,
      max: 100,
      valueText: '75 of 100 health',
      toView: meterView,
    },
    h,
  )
}

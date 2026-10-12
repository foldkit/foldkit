import type { Document } from 'foldkit/html'

import type { Model } from '../model'
import type * as Chart from './chart'
import { headerView, telemetryStateView } from './layout'

export const view = (model: Model, h: Chart.HtmlBuilder): Document => ({
  title: 'Foldkit Adoption Observatory',
  body: h.div(
    [h.Class('min-h-screen bg-zinc-50 text-zinc-950')],
    [
      h.main(
        [
          h.Class(
            'mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8',
          ),
        ],
        [headerView(model, h), telemetryStateView(model, h)],
      ),
    ],
  ),
})

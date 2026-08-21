import type { Document } from 'foldkit/html'
import { HtmlBuilder } from 'foldkit/html'

import type { Message } from '../message'
import type { Model } from '../model'
import { headerView, telemetryStateView } from './layout'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Foldkit Adoption Observatory',
  body: h.div(
    [h.Class('min-h-screen bg-zinc-50 text-zinc-950')],
    [
      h.main(
        [
          h.Class(
            'mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8',
          ),
        ],
        [headerView(model, h), telemetryStateView(model, h)],
      ),
    ],
  ),
})

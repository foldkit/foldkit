import type { Document } from 'foldkit/html'
import { html } from 'foldkit/html'

import type { Message } from '../message'
import type { Model } from '../model'
import { headerView, telemetryStateView } from './layout'

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
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
          [headerView(model), telemetryStateView(model)],
        ),
      ],
    ),
  }
}

import { ApplicationComposition } from '../composition'
import { headerView, telemetryStateView } from './layout'

export const view = ApplicationComposition.makeView((model, h) => ({
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
}))

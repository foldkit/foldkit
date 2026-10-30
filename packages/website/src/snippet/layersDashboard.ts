import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { BonusPanel } from './blockOptionalChild'
import { LinkedCounters } from './blockSiblings'

export class Dashboard extends Block<Dashboard>()('Dashboard', {
  Model: Schema.Struct({ linked: LinkedCounters, bonus: BonusPanel }),
}) {}

export const DashboardLive = Dashboard.make(
  Effect.fn(function* () {
    const linked = yield* new LinkedCounters('linked')
    const bonus = yield* new BonusPanel('bonus')

    return {
      model: { linked, bonus },

      view: (model, h) => ({
        title: 'Dashboard',
        body: h.main([], [model.linked.view(), model.bonus.view()]),
      }),
    }
  }),
)

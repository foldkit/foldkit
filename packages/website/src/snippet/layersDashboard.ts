import { Schema } from 'effect'
import { Block } from 'foldkit'

import { BonusPanel } from './blockOptionalChild'
import { LinkedCounters } from './blockSiblings'

export class Dashboard extends Block<Dashboard>()('Dashboard', {
  Model: Schema.Struct({ linked: LinkedCounters, bonus: BonusPanel }),
}) {}

export const DashboardLive = Dashboard.toLayer(() => ({
  init: () => ({
    linked: new LinkedCounters('linked'),
    bonus: new BonusPanel('bonus'),
  }),

  view: (model, h) => ({
    title: 'Dashboard',
    body: h.main([], [model.linked.view(), model.bonus.view()]),
  }),
}))

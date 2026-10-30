import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { CounterLive } from './blockCounterChild'
import { BonusPanelLive } from './blockOptionalChild'
import { LinkedCountersLive } from './blockSiblings'
import { ApplicationLayer } from './layers'
import { Dashboard, DashboardLive } from './layersDashboard'

const program = Program.make(Dashboard, {
  layer: DashboardLive.pipe(
    Layer.provide(Layer.mergeAll(LinkedCountersLive, BonusPanelLive)),
    Layer.provide(CounterLive),
    Layer.provide(ApplicationLayer),
  ),
  container: document.getElementById('root'),
})

Runtime.run(program)

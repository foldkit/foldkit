import { Runtime } from 'foldkit'

import { ApplicationComposition } from './composition'
import { registerEcharts } from './echarts'
import { init } from './init'
import { EffectsLayer } from './layer'
import { Message } from './message'
import { ApplicationLayer } from './services'
import { update } from './update'
import { view } from './view'

registerEcharts()

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application.provide(ApplicationLayer))

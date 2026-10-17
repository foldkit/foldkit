import { Runtime } from 'foldkit'

import { EffectsLayer } from './command'
import { ApplicationComposition } from './composition'
import { init } from './init'
import { Message } from './message'
import { ApplicationLayer } from './services'
import { update } from './update'
import { view } from './view'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application.provide(ApplicationLayer))

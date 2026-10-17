import { Runtime } from 'foldkit'

import { EffectsLayer } from './command'
import { ApplicationComposition } from './composition'
import { Flags, flags } from './flags'
import { init } from './init'
import { Message } from './message'
import { ApplicationLayer } from './services'
import { update } from './update'
import { view } from './view/view'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer,
  Flags,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application.provide(ApplicationLayer), { flags })

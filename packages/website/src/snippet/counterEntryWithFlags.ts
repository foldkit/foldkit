import { Runtime } from 'foldkit'

import { ApplicationComposition, init, update, view } from './counterFlagsRoot'
import { Flags, flags } from './flagsDefinition'
import { ApplicationLayer } from './services'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  Flags,
  container: document.getElementById('root'),
})

Runtime.run(application.provide(ApplicationLayer), { flags })

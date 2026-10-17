import { Runtime } from 'foldkit'

import { ApplicationComposition } from './composition'
import { Flags, flags } from './flags'
import { init } from './init'
import { ApplicationLayer } from './services'
import { update } from './update'
import { view } from './view'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  Flags,
  container: document.getElementById('root'),
})

Runtime.run(application.provide(ApplicationLayer), { flags })

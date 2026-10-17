import { Runtime } from 'foldkit'

import { ApplicationLayer, EffectsLayer } from './layers'
import { ApplicationComposition, init, update, view } from './layersApplication'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer,
  container: document.getElementById('root'),
})

Runtime.run(application.provide(ApplicationLayer))

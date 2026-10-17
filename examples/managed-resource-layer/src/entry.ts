import { Runtime } from 'foldkit'

import {
  ApplicationComposition,
  EffectsLayer,
  Message,
  init,
  managedResources,
  update,
  view,
} from './application'
import { ApplicationLayer } from './services'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  managedResources,
  EffectsLayer,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application.provide(ApplicationLayer))

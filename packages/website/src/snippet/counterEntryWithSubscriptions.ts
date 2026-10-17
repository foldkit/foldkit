import { Runtime } from 'foldkit'

import {
  ApplicationComposition,
  EffectsLayer,
  init,
  subscriptions,
  update,
  view,
} from './application'
import { ApplicationLayer } from './services'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer,
  subscriptions,
  container: document.getElementById('root'),
})

Runtime.run(application.provide(ApplicationLayer))

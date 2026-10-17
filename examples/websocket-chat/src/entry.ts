import { Runtime } from 'foldkit'

import { ApplicationComposition } from './composition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { managedResources } from './managedResource'
import { Message } from './message'
import { ApplicationLayer } from './services'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  subscriptions,
  managedResources,
  EffectsLayer,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application.provide(ApplicationLayer))

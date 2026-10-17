import { Runtime } from 'foldkit'

import { ApplicationComposition } from './composition'
import { init } from './init'
import { Message } from './message'
import { EffectsLayer, handleSlow, subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
  container: document.getElementById('root'),
  slow: {
    show: 'Always',
    onSlow: handleSlow,
  },
  devTools: { Message },
})

Runtime.run(application)

import { Runtime } from 'foldkit'

import {
  ApplicationComposition,
  EffectsLayer,
  Flags,
  Message,
  init,
  update,
  view,
} from './application'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer,
  Flags,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.hydrate(application)

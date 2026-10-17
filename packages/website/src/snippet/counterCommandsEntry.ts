import { Runtime } from 'foldkit'

import {
  ApplicationComposition,
  init,
  update,
  view,
  EffectsLayer,
} from './application'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer,
  container: document.getElementById('root'),
})

Runtime.run(application)

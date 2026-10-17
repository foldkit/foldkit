import { Runtime } from 'foldkit'

import {
  ApplicationComposition,
  FetchCountLayer,
  Message,
  update,
} from './counterHttpCommand'
import { init, view } from './counterHttpCompletion'
import { ApplicationLayer } from './services'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer: FetchCountLayer,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application.provide(ApplicationLayer))

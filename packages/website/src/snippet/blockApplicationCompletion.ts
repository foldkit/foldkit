import { Runtime } from 'foldkit'

import {
  ApplicationComposition,
  init,
  Message,
  update,
  view,
} from './blockProfile'
import { ApplicationLayer } from './services'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application.provide(ApplicationLayer))

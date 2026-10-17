import { Runtime } from 'foldkit'

import {
  ApplicationComposition,
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
  Flags,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.hydrate(application)

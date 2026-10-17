import { Runtime } from 'foldkit'

import {
  ApplicationComposition,
  Message,
  init,
  update,
  view,
} from './application'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application)

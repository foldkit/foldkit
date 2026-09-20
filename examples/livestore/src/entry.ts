import { Runtime } from 'foldkit'

import {
  Flags,
  Message,
  Model,
  flags,
  init,
  subscriptions,
  update,
  view,
} from './main'
import { resources } from './resources'

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  resources,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(application, { flags })

import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import {
  Message,
  Model,
  init,
  resources,
  subscriptions,
  update,
  view,
} from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  resources,
  container: document.getElementById('root'),
  devTools: {
    overlay,
    Message,
  },
})

Runtime.run(application)

import { Runtime } from 'foldkit'

import { Message, Model, init, subscriptions, update, view } from './main'
import { resources } from './resources'

const application = Runtime.makeApplication({
  Model,
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

Runtime.run(application)

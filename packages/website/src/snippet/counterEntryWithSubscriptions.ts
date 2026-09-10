import { Runtime } from 'foldkit'

import { Model, init, subscriptions, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
})

Runtime.run(application)

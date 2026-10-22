import { Runtime } from 'foldkit'

import { Model, init, update, view } from './main'
import { Message } from './message'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: { Message },
})

Runtime.run(application)

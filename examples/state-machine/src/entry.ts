import { Runtime } from 'foldkit'

import { Message, Model, init, update } from './main'
import { view } from './view'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(application)

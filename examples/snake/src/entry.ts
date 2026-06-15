import { overlay } from '@foldkit/devtools'
import { Runtime } from 'foldkit'

import { Message, Model, init, subscriptions, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  devTools: {
    overlay,
    Message,
  },
})

Runtime.run(application)

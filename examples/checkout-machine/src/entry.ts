import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import { Message, Model, init, update } from './main'
import { view } from './view'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    overlay,
    Message,
  },
})

Runtime.run(application)

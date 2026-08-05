import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import { Flags, Message, Model, init, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  Flags,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    overlay,
    Message,
  },
})

Runtime.hydrate(application)

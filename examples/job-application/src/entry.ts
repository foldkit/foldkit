import { Runtime } from 'foldkit'

import { Flags, Message, Model, flags, init, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(application)

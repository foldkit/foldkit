import { overlay } from '@foldkit/devtools'
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
    overlay,
    Message,
  },
})

Runtime.run(application)

import { Application, Runtime } from 'foldkit'

import { Flags, Live, Message, Model, flags, init, update, view } from './main'

const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, Live), { flags })

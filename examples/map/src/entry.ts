import { Application, Runtime } from 'foldkit'

import { Live, Message, Model, init, mounts, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  mounts,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, Live))

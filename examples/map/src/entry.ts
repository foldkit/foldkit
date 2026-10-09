import { Application, Runtime } from 'foldkit'

import { Message, Model, init, layer, mounts, update, view } from './main'

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

Runtime.run(Application.provide(application, layer))

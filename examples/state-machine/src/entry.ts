import { Application, Runtime } from 'foldkit'

import { EffectsLayer, Message, Model, init, mounts, update } from './main'
import { view } from './view'

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

Runtime.run(Application.provide(application, EffectsLayer))

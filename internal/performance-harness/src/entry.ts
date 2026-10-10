import { Application, Runtime } from 'foldkit'

import { EffectsLayer, Message, Model, init, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, EffectsLayer))

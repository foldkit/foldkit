import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { EffectsLayer, Message, Model, init, update } from './main'
import { view } from './view'

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

pipe(application, Application.provide(EffectsLayer), Runtime.run)

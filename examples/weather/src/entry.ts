import { Layer, pipe } from 'effect'
import { Application, Http, Runtime } from 'foldkit'

import { EffectsLayer, Message, Model, init, update, view } from './main'

const AppLayer = Layer.provide(EffectsLayer, Http.layer)

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

pipe(application, Application.provide(AppLayer), Runtime.run)

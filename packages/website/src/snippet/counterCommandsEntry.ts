import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { EffectsLayer, Model, init, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

pipe(application, Application.provide(EffectsLayer), Runtime.run)

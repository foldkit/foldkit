import { Layer, pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import * as UI from '@foldkit/ui'

import * as App from './main'

const EffectsLayer = Layer.mergeAll(App.EffectsLayer, UI.EffectsLayer)

const application = Application.make({
  Model: App.Model,
  init: App.init,
  update: App.update,
  view: App.view,
  container: document.getElementById('root'),
  mounts: UI.mounts,
})

const runnable = pipe(application, Application.provide(EffectsLayer))

Runtime.run(runnable)

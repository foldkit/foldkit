import { Layer, pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { Dialog, Menu } from '@foldkit/ui'

import * as App from './main'

const EffectsLayer = Layer.mergeAll(
  App.EffectsLayer,
  Dialog.EffectsLayer,
  Menu.EffectsLayer,
)

const application = Application.make({
  Model: App.Model,
  init: App.init,
  update: App.update,
  view: App.view,
  container: document.getElementById('root'),
  mounts: [...Dialog.mounts, ...Menu.mounts],
})

const runnable = pipe(application, Application.provide(EffectsLayer))

Runtime.run(runnable)

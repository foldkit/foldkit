import { Application, Runtime } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { Flags, Model, flags, init, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  Flags,
  container: document.getElementById('root'),
})

Runtime.run(
  Application.provide(application, BrowserKeyValueStore.layerLocalStorage),
  { flags },
)

import { Layer, pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'

import {
  EffectsLayer,
  Message,
  Model,
  init,
  managedResources,
  update,
  view,
} from './main'

const AppLayer = Layer.provide(EffectsLayer, BrowserCrypto.layer)

const application = Application.make({
  Model,
  init,
  update,
  view,
  managedResources,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

pipe(application, Application.provide(AppLayer), Runtime.run)

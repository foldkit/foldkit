import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'

import {
  Layer as HandlersLayer,
  Message,
  Model,
  init,
  managedResources,
  update,
  view,
} from './main'

const AppLayer = Layer.provide(HandlersLayer, BrowserCrypto.layer)

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

Runtime.run(Application.provide(application, AppLayer))

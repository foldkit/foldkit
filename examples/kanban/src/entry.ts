import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserCrypto, BrowserKeyValueStore } from '@effect/platform-browser'

import {
  Flags,
  layer as HandlersLayer,
  Message,
  Model,
  flags,
  init,
  subscriptions,
  update,
  view,
} from './main'

const BrowserServicesLayer = Layer.mergeAll(
  BrowserCrypto.layer,
  BrowserKeyValueStore.layerLocalStorage,
)
const layer = HandlersLayer.pipe(Layer.provideMerge(BrowserServicesLayer))

const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, layer), { flags })

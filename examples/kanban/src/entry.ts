import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserCrypto, BrowserKeyValueStore } from '@effect/platform-browser'

import {
  Flags,
  Live as HandlersLive,
  Message,
  Model,
  flags,
  init,
  subscriptions,
  update,
  view,
} from './main'

const BrowserServicesLive = Layer.mergeAll(
  BrowserCrypto.layer,
  BrowserKeyValueStore.layerLocalStorage,
)
const Live = HandlersLive.pipe(Layer.provideMerge(BrowserServicesLive))

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

Runtime.run(Application.provide(application, Live), { flags })

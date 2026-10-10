import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserCrypto, BrowserKeyValueStore } from '@effect/platform-browser'

import {
  EffectsLayer,
  Flags,
  Message,
  Model,
  flags,
  init,
  mounts,
  subscriptions,
  update,
  view,
} from './main'

const ServicesLayer = Layer.mergeAll(
  BrowserCrypto.layer,
  BrowserKeyValueStore.layerLocalStorage,
)
const AppLayer = EffectsLayer.pipe(Layer.provideMerge(ServicesLayer))

const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  mounts,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, AppLayer), { flags })

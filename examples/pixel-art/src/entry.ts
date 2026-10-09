import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

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

const layer = HandlersLayer.pipe(
  Layer.provideMerge(BrowserKeyValueStore.layerLocalStorage),
)

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

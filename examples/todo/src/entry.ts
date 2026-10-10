import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import {
  EffectsLayer,
  Flags,
  Message,
  Model,
  flags,
  init,
  update,
  view,
} from './main'

const AppLayer = EffectsLayer.pipe(
  Layer.provideMerge(BrowserKeyValueStore.layerLocalStorage),
)

const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, AppLayer), { flags })

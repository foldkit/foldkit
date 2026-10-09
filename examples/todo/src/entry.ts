import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import {
  Flags,
  Live as HandlersLive,
  Message,
  Model,
  flags,
  init,
  update,
  view,
} from './main'

const Live = HandlersLive.pipe(
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

Runtime.run(Application.provide(application, Live), { flags })

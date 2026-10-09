import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'

import {
  Live as HandlersLive,
  Message,
  Model,
  init,
  managedResources,
  update,
  view,
} from './main'

const Live = HandlersLive.pipe(Layer.provideMerge(BrowserCrypto.layer))

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

Runtime.run(Application.provide(application, Live))

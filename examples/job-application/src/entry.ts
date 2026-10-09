import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'

import {
  Flags,
  layer as HandlersLayer,
  Message,
  Model,
  flags,
  init,
  update,
  view,
} from './main'

const layer = HandlersLayer.pipe(Layer.provideMerge(BrowserCrypto.layer))

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

Runtime.run(Application.provide(application, layer), { flags })

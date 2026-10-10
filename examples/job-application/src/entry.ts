import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'

import {
  EffectsLayer,
  Flags,
  Message,
  Model,
  flags,
  init,
  mounts,
  update,
  view,
} from './main'

const AppLayer = EffectsLayer.pipe(Layer.provideMerge(BrowserCrypto.layer))

const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  mounts,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, AppLayer), { flags })

import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { Flags, Live as HandlersLive, flags, init } from './main'
import { Message } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

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
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, Live), { flags })

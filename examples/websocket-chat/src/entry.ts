import { Layer } from 'effect'
import { Socket } from 'effect/socket'
import { Application, Runtime } from 'foldkit'

import {
  EffectsLayer,
  Message,
  Model,
  init,
  managedResources,
  subscriptions,
  update,
  view,
} from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  subscriptions,
  managedResources,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

const AppLayer = Layer.provide(
  EffectsLayer,
  Socket.layerWebSocketConstructorGlobal,
)

Runtime.run(Application.provide(application, AppLayer))

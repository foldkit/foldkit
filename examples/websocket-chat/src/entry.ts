import { Layer } from 'effect'
import { Socket } from 'effect/socket'
import { Application, Runtime } from 'foldkit'

import {
  Layer as HandlersLayer,
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
  HandlersLayer,
  Socket.layerWebSocketConstructorGlobal,
)

Runtime.run(Application.provide(application, AppLayer))

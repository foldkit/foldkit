import { Layer } from 'effect'
import { Socket } from 'effect/socket'
import { Application, Runtime } from 'foldkit'

import {
  Message,
  Model,
  init,
  layer,
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

Runtime.run(
  Application.provide(
    application,
    layer.pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal)),
  ),
)

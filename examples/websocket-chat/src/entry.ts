import { Layer } from 'effect'
import { Socket } from 'effect/socket'
import { Application, Runtime } from 'foldkit'

import {
  Live,
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

Runtime.run(
  Application.provide(
    application,
    Live.pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal)),
  ),
)

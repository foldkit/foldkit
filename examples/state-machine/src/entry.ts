import { Application, Runtime } from 'foldkit'

import { Message, Model, PlaceOrderLive, init, update } from './main'
import { view } from './view'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, PlaceOrderLive))

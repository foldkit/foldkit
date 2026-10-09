import { Layer } from 'effect'
import { Application, Http, Runtime } from 'foldkit'

import {
  Layer as HandlersLayer,
  Message,
  Model,
  init,
  update,
  view,
} from './main'

const AppLayer = Layer.provide(HandlersLayer, Http.layer)

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

Runtime.run(Application.provide(application, AppLayer))

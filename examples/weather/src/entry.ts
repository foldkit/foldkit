import { Layer } from 'effect'
import { Application, Http, Runtime } from 'foldkit'

import {
  layer as HandlersLayer,
  Message,
  Model,
  init,
  update,
  view,
} from './main'

const layer = HandlersLayer.pipe(Layer.provideMerge(Http.layer))

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

Runtime.run(Application.provide(application, layer))

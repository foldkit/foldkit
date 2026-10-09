import { Application, Runtime } from 'foldkit'

import { Flags, Layer, Message, Model, init, update, view } from './main'
import './styles.css'

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

Runtime.hydrate(Application.provide(application, Layer))

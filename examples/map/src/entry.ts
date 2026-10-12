import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { AppLayer, Message, Model, init, mounts, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  mounts,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

pipe(application, Application.provide(AppLayer), Runtime.run)

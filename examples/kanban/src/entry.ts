import { Application, Runtime } from 'foldkit'

import { AppLayer } from './layer'
import {
  Flags,
  Message,
  Model,
  flags,
  init,
  mounts,
  subscriptions,
  update,
  view,
} from './main'

const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  mounts,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, AppLayer), { flags })

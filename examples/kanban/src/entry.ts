import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { AppLayer } from './layer'
import {
  Flags,
  Message,
  Model,
  flags,
  init,
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
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

pipe(application, Application.provide(AppLayer), Runtime.run({ flags }))

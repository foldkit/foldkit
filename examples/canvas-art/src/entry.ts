import { Application, Runtime } from 'foldkit'

import {
  GenerateBallLive,
  Message,
  Model,
  init,
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
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, GenerateBallLive))

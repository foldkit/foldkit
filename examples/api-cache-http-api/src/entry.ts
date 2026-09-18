import { Runtime } from 'foldkit'

import {
  BlogClient,
  Message,
  Model,
  init,
  subscriptions,
  update,
  view,
} from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  resources: BlogClient.layer,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(application)

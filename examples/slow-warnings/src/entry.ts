import { Application, Runtime } from 'foldkit'

import {
  Message,
  Model,
  handleSlow,
  init,
  layer,
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
  slow: {
    show: 'Always',
    onSlow: handleSlow,
  },
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, layer))

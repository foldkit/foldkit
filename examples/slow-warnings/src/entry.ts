import { Application, Runtime } from 'foldkit'

import {
  Live,
  Message,
  Model,
  handleSlow,
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
  slow: {
    show: 'Always',
    onSlow: handleSlow,
  },
  devTools: {
    Message,
  },
})

Runtime.run(Application.provide(application, Live))

import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import {
  Message,
  Model,
  init,
  publishSlowWarning,
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
  container: document.getElementById('root'),
  slow: {
    show: 'Always',
    onSlow: publishSlowWarning,
    update: {},
    view: {},
    patch: {},
    subscriptions: {},
  },
  devTools: {
    overlay,
    Message,
  },
})

Runtime.run(application)

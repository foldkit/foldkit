import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import {
  EffectsLayer,
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

pipe(application, Application.provide(EffectsLayer), Runtime.run)

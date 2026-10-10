import { Application, Runtime } from 'foldkit'

import {
  Model,
  GameClockTicksLayer,
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
})

Runtime.run(Application.provide(application, GameClockTicksLayer))

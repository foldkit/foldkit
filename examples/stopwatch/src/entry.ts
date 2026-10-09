import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import {
  DetermineStartTimeLive,
  DetermineTickTimeLive,
  Message,
  Model,
  StopwatchTicksLive,
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

const StopwatchLive = Layer.mergeAll(
  DetermineStartTimeLive,
  DetermineTickTimeLive,
  StopwatchTicksLive,
)
const runnable = Application.provide(application, StopwatchLive)

Runtime.run(runnable)

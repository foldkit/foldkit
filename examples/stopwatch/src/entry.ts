import { Layer } from 'effect'
import { Application, Runtime } from 'foldkit'

import {
  DetermineStartTimeLive,
  DetermineTickTimeLive,
  Message,
  Model,
  WatchStopwatchTicksLive,
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
  WatchStopwatchTicksLive,
)
const runnable = Application.provide(application, StopwatchLive)

Runtime.run(runnable)

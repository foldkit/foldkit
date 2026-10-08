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

const withStartTime = Application.provide(application, DetermineStartTimeLive)
const withTickTime = Application.provide(withStartTime, DetermineTickTimeLive)
const runnable = Application.provide(withTickTime, WatchStopwatchTicksLive)

Runtime.run(runnable)

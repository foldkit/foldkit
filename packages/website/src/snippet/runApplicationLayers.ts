import { Application, Http, Runtime } from 'foldkit'

import { FetchWeatherLive, Message, Model, init, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: { Message },
})

const withWeatherHandler = Application.provide(application, FetchWeatherLive)
const runnable = Application.provide(withWeatherHandler, Http.layer)

Runtime.run(runnable)

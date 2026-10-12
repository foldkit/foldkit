import { pipe } from 'effect'
import { Application, Runtime } from 'foldkit'

import { registerEcharts } from './echarts'
import { init } from './init'
import { AppLayer, mounts } from './layer'
import { Message } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

registerEcharts()

const application = Application.make({
  Model,
  init,
  update,
  view,
  mounts,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

pipe(application, Application.provide(AppLayer), Runtime.run)

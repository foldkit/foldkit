import { Application, Runtime } from 'foldkit'

import { registerEcharts } from './echarts'
import { init } from './init'
import { Live, mounts } from './live'
import { Message } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view/index'

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

Runtime.run(Application.provide(application, Live))

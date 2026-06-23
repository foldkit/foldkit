import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import { registerEcharts } from './echarts'
import { init } from './init'
import { Message } from './message'
import { Model } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/index'

registerEcharts()

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  devTools: {
    overlay,
    Message,
  },
})

Runtime.run(application)

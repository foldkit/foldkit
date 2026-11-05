import { Program, Runtime } from 'foldkit'

import { registerEcharts } from './echarts'
import { ApplicationBlock, layer } from './index'
import { ApplicationLayer } from './services'

registerEcharts()

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program.provide(ApplicationLayer))

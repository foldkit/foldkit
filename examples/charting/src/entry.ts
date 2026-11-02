import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './application'
import { registerEcharts } from './domain/echarts'
import { ApplicationLayer } from './services'
import { SidebarLive } from './sidebar'

registerEcharts()

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(SidebarLive),
    Layer.provide(ApplicationLayer),
  ),
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)

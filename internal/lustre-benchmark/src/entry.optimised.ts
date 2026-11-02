import { Program, Runtime } from 'foldkit'

import { Application } from './application'
import { ApplicationLive } from './application.optimised'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  devTools: false,
})

Runtime.run(program)

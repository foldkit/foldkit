import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './counterCommands'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
})

Runtime.run(program)

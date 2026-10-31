import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './application'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)

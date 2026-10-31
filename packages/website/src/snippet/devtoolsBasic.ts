import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './counter'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  devTools: {
    position: 'BottomLeft',
  },
})

Runtime.run(program)

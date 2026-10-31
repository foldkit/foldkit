import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive, handleSlow } from './application'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  slow: {
    show: 'Always',
    onSlow: handleSlow,
  },
  devTools: { dispatch: true },
})

Runtime.run(program)

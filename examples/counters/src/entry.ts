import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './application'
import { CounterLive } from './counter'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(CounterLive)),
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)

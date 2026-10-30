import { Layer } from 'effect'
import { Http, Program, Runtime } from 'foldkit'

import { Application, ApplicationLive } from './counterHttpCommand'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(Http.layer)),
  container: document.getElementById('root'),
})

Runtime.run(program)

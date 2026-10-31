import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { ApplicationLayer } from './layers'
import { Application, ApplicationLive } from './layersApplication'

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(ApplicationLayer)),
  container: document.getElementById('root'),
})

Runtime.run(program)

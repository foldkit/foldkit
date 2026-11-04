import { Program, Runtime } from 'foldkit'

import { ApplicationLayer } from './layers'
import { ApplicationBlock, layer } from './layersApplication'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
})

Runtime.run(program.provide(ApplicationLayer))

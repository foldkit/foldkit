import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './application'
import { ApplicationLayer } from './services'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
})

Runtime.run(program.provide(ApplicationLayer))

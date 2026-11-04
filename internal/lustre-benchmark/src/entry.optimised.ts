import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './application.optimised'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: false,
})

Runtime.run(program)

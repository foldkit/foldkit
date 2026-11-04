import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './counter'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
})

Runtime.run(program)

import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './index'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program)

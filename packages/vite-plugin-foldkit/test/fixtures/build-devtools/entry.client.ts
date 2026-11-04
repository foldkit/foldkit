import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './application'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: { show: 'Always', mode: 'Inspect' },
})

Runtime.hydrate(program)

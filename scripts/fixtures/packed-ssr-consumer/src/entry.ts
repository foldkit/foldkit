import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, Flags, layer } from './application'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.hydrate(program)

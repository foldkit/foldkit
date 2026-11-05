import { Program, Runtime } from 'foldkit'

import { Flags, flags } from './flags'
import { ApplicationBlock, layer } from './index'
import { ApplicationLayer } from './services'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program.provide(ApplicationLayer), {
  flags,
})

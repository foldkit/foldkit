// Before: Program.make received the completed Block and provided services.
import { Program, Runtime } from 'foldkit'

import { ApplicationBlock } from './block'
import { Flags, flags } from './flags'
import { ApplicationLayer } from './services'

const program = Program.make({
  block: ApplicationBlock,
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program.provide(ApplicationLayer), { flags })

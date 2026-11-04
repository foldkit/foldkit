import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './counterApplicationWithFlags'
import { Flags, flags } from './flagsDefinition'
import { ApplicationLayer } from './services'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  Flags,
  container: document.getElementById('root'),
})

Runtime.run(program.provide(ApplicationLayer), { flags })

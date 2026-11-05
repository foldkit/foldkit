import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './index'
import { ApplicationLayer } from './services'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program.provide(ApplicationLayer))

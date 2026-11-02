import { Program, Runtime } from 'foldkit'

import { ApplicationBlock } from './block'
import { AppLayer } from './layer'

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program.provide({ services: AppLayer }))

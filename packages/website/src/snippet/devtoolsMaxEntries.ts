import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './block'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: {
    maxEntries: 250,
  },
})

Runtime.run(program)

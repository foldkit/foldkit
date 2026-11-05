import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './block'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: {
    keyframeInterval: 1,
  },
})

Runtime.run(program)

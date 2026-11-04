import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './application'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: {
    excludeFromHistory: ['TickedFrame', 'MovedPointer'],
  },
})

Runtime.run(program)

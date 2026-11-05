import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './index'
import { handleSlow } from './subscription'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  slow: {
    show: 'Always',
    onSlow: handleSlow,
  },
  devTools: { dispatch: true },
})

Runtime.run(program)

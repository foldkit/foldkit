import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, Flags, layer } from './block'
import './styles.css'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.hydrate(program)

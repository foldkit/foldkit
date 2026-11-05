import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './block'

const element = Program.makeElement({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('widget'),
})

Runtime.run(element)

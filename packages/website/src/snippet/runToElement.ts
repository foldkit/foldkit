import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './application'

const element = Program.makeElement({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('widget'),
})

Runtime.run(element)

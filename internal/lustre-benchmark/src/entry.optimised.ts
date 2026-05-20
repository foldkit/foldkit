import { Runtime } from 'foldkit'

import { Model, init, update } from './main'
import { view } from './main.optimised'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: false,
})

Runtime.run(program)

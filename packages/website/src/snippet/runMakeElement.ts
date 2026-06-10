import { Runtime } from 'foldkit'

import { Model, init, update, view } from './main'

const program = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('widget'),
})

Runtime.run(program)

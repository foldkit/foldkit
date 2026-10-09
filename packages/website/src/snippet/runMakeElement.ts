import { Application, Runtime } from 'foldkit'

import { Model, init, update, view } from './main'

const element = Application.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('widget'),
})

Runtime.run(element)

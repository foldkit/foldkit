import { Application, Runtime } from 'foldkit'

import { Model, init, update, view } from './main'

const application = Application.make({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

Runtime.run(application)

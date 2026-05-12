import { Runtime } from 'foldkit'

import { Message, Model, init, update, view } from './main'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(program)

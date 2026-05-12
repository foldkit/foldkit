import { Runtime } from 'foldkit'

import { Flags, Message, Model, flags, init, update, view } from './main'

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(program)

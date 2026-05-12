import { Runtime } from 'foldkit'

import { Message, Model, init, subscriptions, update, view } from './main'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(program)

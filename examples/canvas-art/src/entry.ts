import { Runtime } from 'foldkit'

import { Message, Model, init, subscriptions, update, view } from './main'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  subscriptions,
  /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(program)

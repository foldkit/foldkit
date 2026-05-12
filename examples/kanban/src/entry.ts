import { Runtime } from 'foldkit'

import {
  Flags,
  Message,
  Model,
  flags,
  init,
  subscriptions,
  update,
  view,
} from './main'

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
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

import { FetchHttpClient } from 'effect/unstable/http'
import { DataCommand, Runtime } from 'foldkit'

import { Message, Model, execute, init, update, view } from './main'

const program = DataCommand.makeProgram({
  Model,
  init,
  update,
  execute,
  view,
  container: document.getElementById('root'),
  resources: FetchHttpClient.layer,
  devTools: {
    Message,
  },
})

Runtime.run(program)

import { Option } from 'effect'
import { Runtime } from 'foldkit'

import { Message, Model, crashView, init, update, view } from './main'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  // Remove me to see the default crash view
  crash: {
    view: crashView,
    report: ({ error, model, message }) => {
      console.log('Crash report:', {
        error,
        model,
        message: Option.getOrUndefined(message),
      })
    },
  },
  container: document.getElementById('root'),
  devTools: {
    Message,
  },
})

Runtime.run(program)

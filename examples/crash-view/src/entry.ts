import { Option } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Application, ApplicationLive, crashView } from './application'

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
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
  devTools: { dispatch: true },
})

Runtime.run(program)

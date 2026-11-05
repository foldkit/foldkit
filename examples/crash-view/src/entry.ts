import { Option } from 'effect'
import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, crashView, layer } from './block'

const program = Program.make({
  block: ApplicationBlock,
  layer,
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

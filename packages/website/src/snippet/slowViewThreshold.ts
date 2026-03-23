import { Option } from 'effect'
import { Runtime } from 'foldkit'

const program = Runtime.makeProgram({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  slowView: {
    thresholdMs: 50,
    onSlowView: ({ model, message, durationMs, thresholdMs }) => {
      console.warn(
        `[slow view] ${durationMs.toFixed(1)}ms (budget: ${thresholdMs}ms)`,
        {
          model,
          message: Option.getOrNull(message),
        },
      )
    },
  },
})

Runtime.run(program)

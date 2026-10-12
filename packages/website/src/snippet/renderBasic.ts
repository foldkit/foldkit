import { Effect } from 'effect'
import { Command, Render } from 'foldkit'

const MeasurePanel = Command.define('MeasurePanel', {
  messages: [MeasuredPanel],
  handler: function* () {
    return () =>
      Effect.gen(function* () {
        yield* Render.afterCommit
        const element = document.getElementById('panel')
        const width =
          element instanceof HTMLElement
            ? element.getBoundingClientRect().width
            : 0
        return MeasuredPanel({ width })
      })
  },
})

const StartTransition = Command.define('StartTransition', {
  messages: [StartedTransition],
  handler: function* () {
    return () => Render.afterPaint.pipe(Effect.as(StartedTransition()))
  },
})

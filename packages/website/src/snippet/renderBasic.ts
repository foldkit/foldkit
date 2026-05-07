import { Effect } from 'effect'
import { Command, Render } from 'foldkit'

const MeasurePanel = Command.define('MeasurePanel', MeasuredPanel)
const StartTransition = Command.define('StartTransition', StartedTransition)

const measurePanel = MeasurePanel(
  Effect.gen(function* () {
    yield* Render.afterCommit
    const element = document.getElementById('panel')
    const width =
      element instanceof HTMLElement ? element.getBoundingClientRect().width : 0
    return MeasuredPanel({ width })
  }),
)

const startTransition = StartTransition(
  Render.afterPaint.pipe(Effect.as(StartedTransition())),
)

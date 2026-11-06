import { Runtime } from 'foldkit'

const reportFrame = (frame: Runtime.InstrumentFrame<Message>): void => {
  const trigger = frame.messages.find(
    ({ eventType }) => eventType !== undefined,
  )

  telemetry.record('interaction', {
    event: trigger?.eventType ?? 'none',
    message: trigger?.tag ?? frame.messages[0]?.tag ?? 'init',
    durationMs: frame.durationMs,
    updateMs: frame.updateMs,
    viewMs: frame.viewMs,
    patchMs: frame.patchMs,
  })
}

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  instrument: {
    minDurationMs: 100,
    onFrame: reportFrame,
  },
})

Runtime.run(application)

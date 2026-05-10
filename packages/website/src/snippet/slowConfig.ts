import { Match as M } from 'effect'
import { Runtime } from 'foldkit'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  slow: {
    show: 'Always',
    onSlow: context => {
      const summary = M.value(context).pipe(
        M.tagsExhaustive({
          View: ({ durationMs, thresholdMs }) =>
            `view ${durationMs.toFixed(1)}ms (budget ${thresholdMs}ms)`,
          Update: ({ durationMs, thresholdMs, message }) =>
            `update ${durationMs.toFixed(1)}ms (budget ${thresholdMs}ms) [${message._tag}]`,
          Patch: ({ durationMs, thresholdMs }) =>
            `patch ${durationMs.toFixed(1)}ms (budget ${thresholdMs}ms)`,
          Subscriptions: ({ durationMs, thresholdMs, subscriptionKey }) =>
            `subscription "${subscriptionKey}" ${durationMs.toFixed(1)}ms (budget ${thresholdMs}ms)`,
        }),
      )
      Sentry.captureMessage(`[foldkit slow] ${summary}`)
    },
    view: { thresholdMs: 12 },
    update: { thresholdMs: 4 },
    patch: { thresholdMs: 8 },
    subscriptions: {
      thresholdMs: 1,
      onSlow: context => {
        Sentry.captureMessage(
          `[foldkit slow subscription] ${context.subscriptionKey}`,
        )
      },
    },
  },
})

Runtime.run(application)

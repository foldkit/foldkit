import { Match, Predicate } from 'effect'
import { Program, Runtime } from 'foldkit'

import * as Sentry from '@sentry/browser'

import { Application, ApplicationLive } from './counter'

const messageTag = (message: unknown): string =>
  Predicate.hasProperty(message, '_tag') && Predicate.isString(message._tag)
    ? message._tag
    : 'unknown Message'

const handleSlow = (context: Runtime.SlowContext<unknown, unknown>): void => {
  const summary = Match.value(context).pipe(
    Match.tagsExhaustive({
      View: ({ durationMs, thresholdMs }) =>
        `view ${durationMs.toFixed(1)}ms (budget ${thresholdMs}ms)`,
      Update: ({ durationMs, thresholdMs, message }) =>
        `update ${durationMs.toFixed(1)}ms (budget ${thresholdMs}ms) [${messageTag(message)}]`,
      Patch: ({ durationMs, thresholdMs }) =>
        `patch ${durationMs.toFixed(1)}ms (budget ${thresholdMs}ms)`,
      SubscriptionDependencies: ({
        durationMs,
        thresholdMs,
        subscriptionKey,
      }) =>
        `subscription dependencies "${subscriptionKey}" ${durationMs.toFixed(1)}ms (budget ${thresholdMs}ms)`,
    }),
  )

  Sentry.captureMessage(`[foldkit slow] ${summary}`)
}

const program = Program.make(Application, {
  layer: ApplicationLive,
  container: document.getElementById('root'),
  slow: {
    show: 'Always',
    onSlow: handleSlow,
    thresholdOverrides: {
      Update: 4,
      View: 12,
      Patch: 8,
      SubscriptionDependencies: 1,
    },
  },
})

Runtime.run(program)

import { Match, Option, Schema, Stream, pipe } from 'effect'
import { Dom, Runtime } from 'foldkit'

import { ApplicationDefinition } from './definition'
import { Message } from './message'
import { type Model, SlowWarningReport, Workload } from './model'
import { SUBSCRIPTION_DEPENDENCIES_WORK_MS, burnCpu } from './workload'

const SLOW_WARNING_EVENT = 'foldkit:slow-warning'

const slowWarningTarget: Dom.TypedEventTarget<{
  [SLOW_WARNING_EVENT]: CustomEvent<typeof SlowWarningReport.Type>
}> = new EventTarget()

const messageToTag = ({ _tag }: typeof Message.Type): string => _tag

const maybeMessageTrigger = (
  message: Option.Option<typeof Message.Type>,
): string =>
  Option.match(message, {
    onNone: () => 'initial render',
    onSome: messageToTag,
  })

const triggerForSlowContext = (
  context: Runtime.SlowContext<typeof Model.Type, typeof Message.Type>,
): string =>
  Match.value(context).pipe(
    Match.withReturnType<string>(),
    Match.tagsExhaustive({
      Update: ({ message }) => messageToTag(message),
      View: ({ message }) => maybeMessageTrigger(message),
      Patch: ({ message }) => maybeMessageTrigger(message),
      SubscriptionDependencies: ({ subscriptionKey }) => subscriptionKey,
    }),
  )

const detailsForSlowContext = (
  context: Runtime.SlowContext<typeof Model.Type, typeof Message.Type>,
): string =>
  Match.value(context).pipe(
    Match.withReturnType<string>(),
    Match.tagsExhaustive({
      Update: () =>
        'CPU work ran inside update before Foldkit could return the next Model.',
      View: () =>
        'The view function performed expensive synchronous work while building the next VNode tree.',
      Patch: () =>
        'The patch phase inserted thousands of keyed rows into the live DOM.',
      SubscriptionDependencies: () =>
        'A subscription spent time deriving its dependency struct from the Model.',
    }),
  )

const slowContextToReport = (
  context: Runtime.SlowContext<typeof Model.Type, typeof Message.Type>,
): typeof SlowWarningReport.Type => ({
  phase: context._tag,
  durationMs: context.durationMs,
  thresholdMs: context.thresholdMs,
  trigger: triggerForSlowContext(context),
  details: detailsForSlowContext(context),
})

export const handleSlow = (
  context: Runtime.SlowContext<typeof Model.Type, typeof Message.Type>,
): void => {
  Runtime.defaultSlowCallback(context)

  const report = slowContextToReport(context)
  slowWarningTarget.dispatchEvent(
    new CustomEvent<typeof SlowWarningReport.Type>(SLOW_WARNING_EVENT, {
      detail: report,
    }),
  )
}

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  slowWarningReports: entry('SlowWarningReports', {
    messages: [Message.RecordedSlowWarning],
    handler: function* () {
      return () =>
        Dom.streamFromEventFilterMap({
          target: slowWarningTarget,
          type: SLOW_WARNING_EVENT,
          filterMapEvent: event =>
            pipe(
              event.detail,
              Schema.decodeOption(SlowWarningReport),
              Option.map(report => Message.RecordedSlowWarning({ report })),
            ),
        })
    },
  }),
  dependencyExtractionWork: entry(
    'DependencyExtractionWork',
    { activeWorkload: Workload },
    {
      modelToDependencies: model => {
        if (model.activeWorkload === 'SubscriptionDependencies') {
          burnCpu(SUBSCRIPTION_DEPENDENCIES_WORK_MS)
        }
        return { activeWorkload: model.activeWorkload }
      },
      messages: [],
      handler: function* () {
        return () => Stream.empty
      },
    },
  ),
}))

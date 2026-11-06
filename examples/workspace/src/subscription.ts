import { Array, Duration, Schema, Stream } from 'effect'
import { AsyncData } from 'foldkit'

import { makeSubscriptions } from './block'
import { Message } from './message'
import { protectUnsavedChanges } from './protectUnsavedChanges'
import { unsavedIssueSummaries } from './selectors'

const ACTIVITY_TICK_INTERVAL = Duration.seconds(20)

export const subscriptions = makeSubscriptions(entry => ({
  draftExitGuard: entry(
    'DraftExitGuard',
    { hasUnsavedChanges: Schema.Boolean },
    {
      messages: [],
      modelToDependencies: model => ({
        hasUnsavedChanges: Array.isReadonlyArrayNonEmpty(
          unsavedIssueSummaries(model),
        ),
      }),
      handler: function* () {
        return protectUnsavedChanges
      },
    },
  ),
  activity: entry('Activity', {
    messages: [Message.TickedActivityStream],
    when: model => AsyncData.hasData(model.workspaceAsyncData),
    handler: function* () {
      return () =>
        Stream.tick(ACTIVITY_TICK_INTERVAL).pipe(
          Stream.drop(1),
          Stream.map(Message.TickedActivityStream),
        )
    },
  }),
}))

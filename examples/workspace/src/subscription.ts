import { Array, Duration, Schema, Stream } from 'effect'
import { AsyncData } from 'foldkit'

import { ApplicationDefinition } from './definition'
import { protectUnsavedChanges } from './draftProtection'
import { Message } from './message'

const ACTIVITY_INTERVAL = Duration.seconds(20)

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  draftExitGuard: entry(
    'DraftExitGuard',
    { isProtecting: Schema.Boolean },
    {
      messages: [],
      modelToDependencies: model => ({
        isProtecting: Array.isReadonlyArrayNonEmpty(model.issueDrafts),
      }),
      handler: function* () {
        return protectUnsavedChanges
      },
    },
  ),
  activity: entry(
    'Activity',
    { isActive: Schema.Boolean },
    {
      messages: [Message.TickedActivityStream],
      modelToDependencies: model => ({
        isActive: AsyncData.hasData(model.workspaceAsyncData),
      }),
      handler: function* () {
        return ({ isActive }) =>
          isActive
            ? Stream.tick(ACTIVITY_INTERVAL).pipe(
                Stream.drop(1),
                Stream.map(Message.TickedActivityStream),
              )
            : Stream.empty
      },
    },
  ),
}))

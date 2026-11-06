import { Schema } from 'effect'

import { protectUnsavedChanges } from '../../protectUnsavedChanges'
import { makeSubscriptions } from './block'
import { hasUnsavedChanges } from './draft'

export const subscriptions = makeSubscriptions(entry => ({
  draftExitGuard: entry(
    'ProjectDraftExitGuard',
    { hasUnsavedChanges: Schema.Boolean },
    {
      messages: [],
      modelToDependencies: model => ({
        hasUnsavedChanges: hasUnsavedChanges(model),
      }),
      handler: function* () {
        return protectUnsavedChanges
      },
    },
  ),
}))

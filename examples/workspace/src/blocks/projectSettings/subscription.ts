import { Schema } from 'effect'

import { protectUnsavedChanges } from '../../draftProtection'
import { makeSubscriptions } from './block'
import { isDirty } from './draft'

export const subscriptions = makeSubscriptions(entry => ({
  draftExitGuard: entry(
    'ProjectDraftExitGuard',
    { isProtecting: Schema.Boolean },
    {
      messages: [],
      modelToDependencies: model => ({ isProtecting: isDirty(model) }),
      handler: function* () {
        return protectUnsavedChanges
      },
    },
  ),
}))

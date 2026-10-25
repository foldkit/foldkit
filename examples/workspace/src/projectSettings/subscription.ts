import { Schema } from 'effect'

import { protectUnsavedChanges } from '../draftProtection'
import { ProjectSettingsDefinition } from './definition'
import { isDirty } from './draft'

export const subscriptions = ProjectSettingsDefinition.makeSubscriptions(
  entry => ({
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
  }),
)

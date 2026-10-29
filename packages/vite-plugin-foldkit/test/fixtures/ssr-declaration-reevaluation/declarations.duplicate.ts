import { Effect } from 'effect'

import { ApplicationDefinition, Message } from './definition'

export const LoadPreferences = ApplicationDefinition.makeCommand(
  'LoadPreferences',
  {
    messages: [Message.CompletedLoadPreferences],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedLoadPreferences())
    },
  },
)

export const LoadPreferencesAgain = ApplicationDefinition.makeCommand(
  'LoadPreferences',
  {
    messages: [Message.CompletedLoadPreferences],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedLoadPreferences())
    },
  },
)

export const revision = 2

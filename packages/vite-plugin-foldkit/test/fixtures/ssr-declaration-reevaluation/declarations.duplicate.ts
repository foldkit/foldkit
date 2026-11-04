import { Effect } from 'effect'

import { ApplicationBlock, Message } from './definition'

export const LoadPreferences = ApplicationBlock.makeCommand('LoadPreferences', {
  messages: [Message.CompletedLoadPreferences],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedLoadPreferences())
  },
})

export const LoadPreferencesAgain = ApplicationBlock.makeCommand(
  'LoadPreferences',
  {
    messages: [Message.CompletedLoadPreferences],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedLoadPreferences())
    },
  },
)

export const revision = 2

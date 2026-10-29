import { Effect, Stream } from 'effect'

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

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  ticks: entry('Ticks', {
    messages: [Message.Ticked],
    handler: function* () {
      return () => Stream.empty
    },
  }),
}))

export const revision = 1

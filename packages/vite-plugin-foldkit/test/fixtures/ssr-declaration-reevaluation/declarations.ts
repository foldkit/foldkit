import { Effect, Stream } from 'effect'

import { ApplicationBlock, Message } from './definition'

export const LoadPreferences = ApplicationBlock.makeCommand('LoadPreferences', {
  messages: [Message.CompletedLoadPreferences],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedLoadPreferences())
  },
})

export const subscriptions = ApplicationBlock.makeSubscriptions(entry => ({
  ticks: entry('Ticks', {
    messages: [Message.Ticked],
    handler: function* () {
      return () => Stream.empty
    },
  }),
}))

export const revision = 1

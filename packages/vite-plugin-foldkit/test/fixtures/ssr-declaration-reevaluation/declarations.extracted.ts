import { Stream } from 'effect'

import { ApplicationDefinition, Message } from './definition'

export { LoadPreferences } from './extracted'

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  ticks: entry('Ticks', {
    messages: [Message.Ticked],
    handler: function* () {
      return () => Stream.empty
    },
  }),
}))

export const revision = 2

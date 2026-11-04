import { Stream } from 'effect'

import { ApplicationBlock, Message } from './definition'

export { LoadPreferences } from './extracted'

export const subscriptions = ApplicationBlock.makeSubscriptions(entry => ({
  ticks: entry('Ticks', {
    messages: [Message.Ticked],
    handler: function* () {
      return () => Stream.empty
    },
  }),
}))

export const revision = 2

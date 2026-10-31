// Before: a Definition-owned Subscription registry with a `when` gate.
import { Duration, Stream } from 'effect'

import { StopwatchDefinition } from './definition'
import { Message } from './message'

export const subscriptions = StopwatchDefinition.makeSubscriptions(entry => ({
  ticks: entry('Ticks', {
    messages: [Message.Ticked],
    when: model => model.isRunning,
    handler: function* () {
      return () =>
        Stream.tick(Duration.seconds(1)).pipe(
          Stream.drop(1),
          Stream.map(Message.Ticked),
        )
    },
  }),
}))

// Later, at completion: subscriptions, EffectsLayer: subscriptions.layer

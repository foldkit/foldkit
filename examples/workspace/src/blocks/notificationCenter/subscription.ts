import { Clock, Duration, Schema, Stream } from 'effect'

import { makeSubscriptions } from './block'
import { Message } from './message'

const CLOCK_INTERVAL = Duration.minutes(1)

export const subscriptions = makeSubscriptions(entry => ({
  clock: entry(
    'Clock',
    { isOpen: Schema.Boolean },
    {
      messages: [Message.TickedClock],
      modelToDependencies: model => ({ isOpen: model.popover.isOpen }),
      handler: function* () {
        const clock = yield* Clock.Clock

        return ({ isOpen }) =>
          isOpen
            ? Stream.tick(CLOCK_INTERVAL).pipe(
                Stream.mapEffect(() => clock.currentTimeMillis),
                Stream.map(currentTimeMillis =>
                  Message.TickedClock({ currentTimeMillis }),
                ),
              )
            : Stream.empty
      },
    },
  ),
}))

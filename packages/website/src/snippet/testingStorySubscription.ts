import { Effect } from 'effect'
import { Story } from 'foldkit'

import { Message, OrderFeedBlock, layer, subscriptions } from './orderFeed'

await Effect.runPromise(
  Story.story(
    { block: OrderFeedBlock, layer },
    Story.init(),
    Story.Subscription.emit(
      subscriptions.entries,
      Message.ReceivedEntry({ sequence: 13, order }),
    ),
    Story.model(model => {
      expect(model.latestSequence).toBe(13)
    }),
  ),
)

import { Effect } from 'effect'
import { Subscription, init, model, story } from 'foldkit/story'

import { Message, OrderFeedBlock, layer, subscriptions } from './orderFeed'

await Effect.runPromise(
  story(
    { block: OrderFeedBlock, layer },
    init(),
    Subscription.emit(
      subscriptions.entries,
      Message.ReceivedEntry({ sequence: 13, order }),
    ),
    model(model => {
      expect(model.latestSequence).toBe(13)
    }),
  ),
)

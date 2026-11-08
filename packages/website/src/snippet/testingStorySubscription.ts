import { Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { Message, OrderFeedBlock, layer, subscriptions } from './orderFeed'

it.effect('records the latest order-feed entry', () =>
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

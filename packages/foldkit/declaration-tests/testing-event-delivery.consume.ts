import * as Story from 'foldkit/story'

import {
  ChildMessage,
  SubscriptionHostBlock,
  receiveCurrentRightCount,
  subscriptionEmitter,
} from './testing-event-delivery.accepted.js'

export const emittedReading = subscriptionEmitter.emit(
  SubscriptionHostBlock.subscriptions.leftReadings,
  ChildMessage.ReceivedReading({ count: 7 }),
)

Story.story(
  SubscriptionHostBlock.update,
  Story.given(SubscriptionHostBlock.init().model),
  emittedReading,
  receiveCurrentRightCount,
)

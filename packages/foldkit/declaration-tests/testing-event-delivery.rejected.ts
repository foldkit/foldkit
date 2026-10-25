import * as Story from 'foldkit/story'

import {
  ChildMessage,
  SubscriptionHostBlock,
  SubscriptionHostMessage,
  subscriptionEmitter,
} from './testing-event-delivery.accepted.js'

// @ts-expect-error An explicit emitter annotation must retain its entry source contract.
type MissingEmissionSource = Story.SubscriptionEmitter<
  typeof SubscriptionHostMessage.Type
>

subscriptionEmitter.emit(
  SubscriptionHostBlock.subscriptions.rightReadings,
  // @ts-expect-error Subscription emit accepts the transformed Schema's decoded Message.
  { _tag: 'ReceivedReading', count: '4' },
)

subscriptionEmitter.emit(
  // @ts-expect-error The entry must belong to the registered Subscription record.
  { messages: [ChildMessage.ReceivedReading] },
  ChildMessage.ReceivedReading({ count: 4 }),
)

Story.story(
  SubscriptionHostBlock.update,
  Story.given(SubscriptionHostBlock.init().model),
  // @ts-expect-error messageWith receives the tested update's precise Model.
  Story.messageWith((model: { readonly missing: string }) =>
    SubscriptionHostMessage.ReceivedLeftReading({
      message: ChildMessage.ReceivedReading({ count: model.missing.length }),
    }),
  ),
)

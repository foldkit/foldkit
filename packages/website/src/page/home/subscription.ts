import { Duration, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import { type Model } from './model'

// SUBSCRIPTION

const TOGGLE_INTERVAL = Duration.seconds(3)

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  aiHeading: Subscription.persistentEntry(
    Stream.tick(TOGGLE_INTERVAL).pipe(
      Stream.drop(1),
      Stream.map(Message.ToggledAiHeading),
    ),
  ),
}))

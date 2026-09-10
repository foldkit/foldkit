import { Duration, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import { type Model } from './model'

// SUBSCRIPTION

const TOGGLE_INTERVAL = Duration.seconds(3)

export const subscriptions = Subscription.make<Model, Message>()(() => ({
  aiHeading: Subscription.persistent(
    Stream.tick(TOGGLE_INTERVAL).pipe(Stream.map(Message.ToggledAiHeading)),
  ),
}))

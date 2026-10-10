import { Duration, Effect, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import { type Model } from './model'

// SUBSCRIPTION

const TOGGLE_INTERVAL = Duration.seconds(3)

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  aiHeadingToggleTicks: entry('AiHeadingToggleTicks', {
    messages: [Message.ToggledAiHeading],
  }),
}))

const AiHeadingToggleTicksLayer = subscriptions.aiHeadingToggleTicks.toLayer(
  Effect.succeed(() =>
    Stream.tick(TOGGLE_INTERVAL).pipe(
      Stream.drop(1),
      Stream.map(Message.ToggledAiHeading),
    ),
  ),
)

export const EffectsLayer = AiHeadingToggleTicksLayer

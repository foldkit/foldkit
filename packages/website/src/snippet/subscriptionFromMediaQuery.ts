import { Schema } from 'effect'
import { Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

const Message = defineMessageUnion({
  ChangedReducedMotion: { isReducedMotion: Schema.Boolean },
})
type Message = typeof Message.Type

// MODEL

const Model = Schema.Struct({
  isReducedMotion: Schema.Boolean,
})
type Model = typeof Model.Type

// SUBSCRIPTION

const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  reducedMotion: Subscription.persistent(
    Subscription.fromMediaQuery({
      query: '(prefers-reduced-motion: reduce)',
      mapMatches: isMatching =>
        Message.ChangedReducedMotion({ isReducedMotion: isMatching }),
    }),
  ),
}))

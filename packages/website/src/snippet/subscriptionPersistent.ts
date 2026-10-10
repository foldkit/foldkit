import { Duration, Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  TickedHeartbeat: {},
})
type Message = typeof Message.Type

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  heartbeatTicks: entry('HeartbeatTicks', {
    messages: [Message.TickedHeartbeat],
    handler: function* () {
      return () =>
        Stream.tick(Duration.seconds(30)).pipe(
          Stream.drop(1),
          Stream.map(Message.TickedHeartbeat),
        )
    },
  }),
}))

export const EffectsLayer = subscriptions.heartbeatTicks.layer

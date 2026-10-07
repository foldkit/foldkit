import { Duration, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  TickedHeartbeat: {},
})
type Message = typeof Message.Type

const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  heartbeat: Subscription.persistent(
    Stream.tick(Duration.seconds(30)).pipe(
      Stream.drop(1),
      Stream.map(Message.TickedHeartbeat),
    ),
  ),
}))

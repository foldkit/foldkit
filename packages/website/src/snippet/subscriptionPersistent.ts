import { Duration, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  TickedHeartbeat: {},
})
type Message = typeof Message.Type

const HeartbeatDefinition = Block.makeDefinition('Heartbeat', {
  Model,
  Message,
})

export const subscriptions = HeartbeatDefinition.makeSubscriptions(entry => ({
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

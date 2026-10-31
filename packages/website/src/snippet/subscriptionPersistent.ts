import { Duration, Effect, Number, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class Heartbeat extends Block<Heartbeat>()('Heartbeat', {
  Model: Schema.Struct({ beatCount: Schema.Number }),
  Message: defineMessageUnion({ TickedHeartbeat: {} }),
}) {}

export const HeartbeatLive = Heartbeat.make(
  Effect.fn(function* () {
    return {
      model: { beatCount: 0 },

      stream: Stream.tick(Duration.seconds(30)).pipe(
        Stream.drop(1),
        Stream.as(Heartbeat.Message.TickedHeartbeat()),
      ),

      update: {
        TickedHeartbeat: model => ({
          model: modifyFields(model, { beatCount: Number.increment }),
        }),
      },
    }
  }),
)

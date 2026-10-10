import { Duration, Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

const Message = defineMessageUnion({
  Ticked: {},
})
type Message = typeof Message.Type

// MODEL

const Model = Schema.Struct({
  isRunning: Schema.Boolean,
  elapsed: Schema.Number,
})
type Model = typeof Model.Type

// SUBSCRIPTION

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  stopwatchTicks: entry(
    'StopwatchTicks',
    { isRunning: Schema.Boolean },
    {
      messages: [Message.Ticked],
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      handler: function* () {
        return ({ isRunning }) =>
          Stream.when(
            Stream.tick(Duration.millis(100)).pipe(
              Stream.drop(1),
              Stream.map(Message.Ticked),
            ),
            Effect.sync(() => isRunning),
          )
      },
    },
  ),
}))

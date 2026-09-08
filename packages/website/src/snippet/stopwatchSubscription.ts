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
  tick: entry(
    { isRunning: Schema.Boolean },
    {
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      dependenciesToStream: ({ isRunning }) =>
        Stream.when(
          Stream.tick(Duration.millis(100)).pipe(Stream.map(Message.Ticked)),
          Effect.sync(() => isRunning),
        ),
    },
  ),
}))

import { Duration, Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ToggledAutoCounting: {},
  Ticked: {},
})
type Message = typeof Message.Type

// MODEL

const Model = Schema.Struct({
  count: Schema.Number,
  isAutoCounting: Schema.Boolean,
})
type Model = typeof Model.Type

// SUBSCRIPTION

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { isAutoCounting: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isAutoCounting: model.isAutoCounting,
      }),
      dependenciesToStream: ({ isAutoCounting }) =>
        Stream.when(
          Stream.tick(Duration.seconds(1)).pipe(Stream.map(Message.Ticked)),
          Effect.sync(() => isAutoCounting),
        ),
    },
  ),
}))

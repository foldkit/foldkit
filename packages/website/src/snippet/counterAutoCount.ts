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

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    'AutoCountTicks',
    { isAutoCounting: Schema.Boolean },
    {
      messages: [Message.Ticked],
      modelToDependencies: model => ({
        isAutoCounting: model.isAutoCounting,
      }),
    },
  ),
}))

export const AutoCountTicksLive = subscriptions.tick.toLayer(
  ({ isAutoCounting }) =>
    Stream.when(
      Stream.tick(Duration.seconds(1)).pipe(
        Stream.drop(1),
        Stream.map(Message.Ticked),
      ),
      Effect.sync(() => isAutoCounting),
    ),
)

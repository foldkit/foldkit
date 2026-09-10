import { Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

const Message = defineMessageUnion({
  PressedKey: { key: Schema.String },
})
type Message = typeof Message.Type

// MODEL

const Model = Schema.Struct({
  isListening: Schema.Boolean,
})
type Model = typeof Model.Type

// SUBSCRIPTION

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  shortcut: entry(
    { isListening: Schema.Boolean },
    {
      modelToDependencies: model => ({ isListening: model.isListening }),
      dependenciesToStream: ({ isListening }) =>
        Stream.when(
          Subscription.fromEvent<KeyboardEvent, Message>({
            target: window,
            type: 'keydown',
            toMessage: event => Message.PressedKey({ key: event.key }),
          }),
          Effect.sync(() => isListening),
        ),
    },
  ),
}))

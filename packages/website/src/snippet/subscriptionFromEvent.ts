import { Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { m } from 'foldkit/message'

// MESSAGE

const PressedKey = m('PressedKey', { key: S.String })

const Message = S.Union([PressedKey])
type Message = typeof Message.Type

// MODEL

const Model = S.Struct({
  isListening: S.Boolean,
})

type Model = typeof Model.Type

// SUBSCRIPTION

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  shortcut: entry(
    { isListening: S.Boolean },
    {
      modelToDependencies: model => ({ isListening: model.isListening }),
      dependenciesToStream: ({ isListening }) =>
        Stream.when(
          Subscription.fromEvent<KeyboardEvent, Message>({
            target: window,
            type: 'keydown',
            toMessage: event => PressedKey({ key: event.key }),
          }),
          Effect.sync(() => isListening),
        ),
    },
  ),
}))

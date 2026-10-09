// page/settings/themeMenu/subscription.ts
import { Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  escapeKey: entry(
    'ThemeMenuEscapePresses',
    { isOpen: Schema.Boolean },
    {
      messages: [Message.PressedEscape],
      modelToDependencies: model => ({ isOpen: model.isOpen }),
    },
  ),
}))

export const ThemeMenuEscapePressesLive = subscriptions.escapeKey.toLayer(
  ({ isOpen }) =>
    Stream.when(
      Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
        Stream.filter(event => event.key === 'Escape'),
        Stream.map(Message.PressedEscape),
      ),
      Effect.sync(() => isOpen),
    ),
)

export { ThemeMenuEscapePressesLive as Live }

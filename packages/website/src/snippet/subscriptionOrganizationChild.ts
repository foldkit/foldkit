// page/settings/themeMenu/subscription.ts
import { Effect, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  themeMenuEscapePresses: entry(
    'ThemeMenuEscapePresses',
    { isOpen: Schema.Boolean },
    {
      messages: [Message.PressedEscape],
      modelToDependencies: model => ({ isOpen: model.isOpen }),
      handler: function* () {
        return ({ isOpen }) =>
          Stream.when(
            Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
              Stream.filter(event => event.key === 'Escape'),
              Stream.map(() => Message.PressedEscape()),
            ),
            Effect.sync(() => isOpen),
          )
      },
    },
  ),
}))

export const EffectsLayer = subscriptions.themeMenuEscapePresses.layer

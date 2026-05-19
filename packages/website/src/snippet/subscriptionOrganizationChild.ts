// page/settings/themeMenu/subscription.ts
import { Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { type Message, PressedEscape } from './message'
import type { Model } from './model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  escapeKey: entry(
    { isOpen: S.Boolean },
    {
      modelToDependencies: model => ({ isOpen: model.isOpen }),
      dependenciesToStream: ({ isOpen }) =>
        Stream.when(
          Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
            Stream.filter(event => event.key === 'Escape'),
            Stream.map(PressedEscape),
          ),
          Effect.sync(() => isOpen),
        ),
    },
  ),
}))

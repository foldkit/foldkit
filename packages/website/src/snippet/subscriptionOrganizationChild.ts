// page/settings/themeMenu/subscription.ts
import { Effect, Schema, Stream } from 'effect'

import { themeMenu } from './definition'
import { Message } from './message'

export const subscriptions = themeMenu.makeSubscriptions(entry => ({
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

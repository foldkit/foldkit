import { Effect, Option, Schema, Stream } from 'effect'
import { Dom, Subscription } from 'foldkit'

import { Message } from '../message'
import type { Model } from '../model'
import { isSearchRoute } from '../route'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  searchShortcutPresses: entry(
    'SearchShortcutPresses',
    { isSearchAvailable: Schema.Boolean },
    {
      messages: [Message.PressedSearchShortcut],
      modelToDependencies: model => ({
        isSearchAvailable: isSearchRoute(model.route),
      }),
      handler: function* () {
        return ({ isSearchAvailable }) =>
          Stream.when(
            Dom.streamFromEventFilterMapPreventDefault({
              target: document,
              type: 'keydown',
              filterMapEvent: event => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                  return Option.some(Message.PressedSearchShortcut())
                }
                return Option.none()
              },
            }),
            Effect.sync(() => isSearchAvailable),
          )
      },
    },
  ),
}))

export const EffectsLayer = subscriptions.searchShortcutPresses.layer

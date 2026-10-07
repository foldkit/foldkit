import { Effect, Option, Schema, Stream } from 'effect'
import { Dom, Subscription } from 'foldkit'

import { Message } from '../message'
import type { Model } from '../model'
import { isSearchRoute } from '../route'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  searchShortcut: entry(
    { isSearchAvailable: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isSearchAvailable: isSearchRoute(model.route),
      }),
      dependenciesToStream: ({ isSearchAvailable }) =>
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
        ),
    },
  ),
}))

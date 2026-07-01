import { Effect, Option, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import type { Model } from '../main'
import { GotSearchMessage, type Message } from '../message'
import { PressedSearchShortcut } from '../search'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  searchShortcut: entry(
    { isDocsPage: S.Boolean },
    {
      modelToDependencies: model => ({
        isDocsPage:
          model.route._tag !== 'Home' && model.route._tag !== 'Newsletter',
      }),
      dependenciesToStream: ({ isDocsPage }) =>
        Stream.when(
          Subscription.fromEventFilterMap<
            KeyboardEvent,
            typeof GotSearchMessage.Type
          >({
            target: document,
            type: 'keydown',
            toMessage: event => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault()
                return Option.some(
                  GotSearchMessage({ message: PressedSearchShortcut() }),
                )
              }
              return Option.none()
            },
          }),
          Effect.sync(() => isDocsPage),
        ),
    },
  ),
}))

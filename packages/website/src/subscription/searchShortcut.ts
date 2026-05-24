import { Effect, Queue, Schema as S, Stream } from 'effect'
import { Subscription, Ui } from 'foldkit'

import type { Model } from '../main'
import { GotSearchMessage, type Message } from '../message'
import { GotSearchDialogMessage } from '../search'

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
          Stream.callback<typeof GotSearchMessage.Type>(queue =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const handler = (event: KeyboardEvent) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                    event.preventDefault()
                    Queue.offerUnsafe(
                      queue,
                      GotSearchMessage({
                        message: GotSearchDialogMessage({
                          message: Ui.Dialog.RequestedOpen(),
                        }),
                      }),
                    )
                  }
                }
                document.addEventListener('keydown', handler)
                return handler
              }),
              handler =>
                Effect.sync(() =>
                  document.removeEventListener('keydown', handler),
                ),
            ).pipe(Effect.flatMap(() => Effect.never)),
          ),
          Effect.sync(() => isDocsPage),
        ),
    },
  ),
}))

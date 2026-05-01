import { Effect, Queue, Stream } from 'effect'
import { Ui } from 'foldkit'
import { Subscription } from 'foldkit/subscription'

import type { Model, SubscriptionDeps } from '../main'
import { GotSearchMessage } from '../message'
import { GotSearchDialogMessage } from '../search'

export const searchShortcut: Subscription<
  Model,
  typeof GotSearchMessage,
  SubscriptionDeps['searchShortcut']
> = {
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
                      message: Ui.Dialog.Opened(),
                    }),
                  }),
                )
              }
            }
            document.addEventListener('keydown', handler)
            return handler
          }),
          handler =>
            Effect.sync(() => document.removeEventListener('keydown', handler)),
        ).pipe(Effect.flatMap(() => Effect.never)),
      ),
      Effect.sync(() => isDocsPage),
    ),
}

import { Effect, Stream } from 'effect'
import { streamFromEmit } from './streamFromEmit'
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
      streamFromEmit<typeof GotSearchMessage.Type>(emit => {
        const handler = (event: KeyboardEvent) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault()
            emit.single(
              GotSearchMessage({
                message: GotSearchDialogMessage({
                  message: Ui.Dialog.Opened(),
                }),
              }),
            )
          }
        }

        document.addEventListener('keydown', handler)

        return Effect.sync(() =>
          document.removeEventListener('keydown', handler),
        )
      }),
      Effect.sync(() => isDocsPage),
    ),
}

import { Effect, Stream } from 'effect'
import { Command, Ui } from 'foldkit'
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
  depsToStream: ({ isDocsPage }) =>
    Stream.when(
      Stream.async<Command.Command<typeof GotSearchMessage>>(emit => {
        const handler = (event: KeyboardEvent) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault()
            emit.single(
              Effect.succeed(
                GotSearchMessage({
                  message: GotSearchDialogMessage({
                    message: Ui.Dialog.Opened(),
                  }),
                }),
              ).pipe(Command.make('GetSearchShortcut')),
            )
          }
        }

        document.addEventListener('keydown', handler)

        return Effect.sync(() =>
          document.removeEventListener('keydown', handler),
        )
      }),
      () => isDocsPage,
    ),
}

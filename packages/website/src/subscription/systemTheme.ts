import { Effect, Stream } from 'effect'
import { Command } from 'foldkit'
import { Subscription } from 'foldkit/subscription'

import { type Model, type SubscriptionDeps } from '../main'
import { ChangedSystemTheme } from '../message'

export const systemTheme: Subscription<
  Model,
  typeof ChangedSystemTheme,
  SubscriptionDeps['systemTheme']
> = {
  modelToDependencies: (model: Model) => ({
    isSystemPreference: model.themePreference === 'System',
  }),
  depsToStream: ({ isSystemPreference }) =>
    Stream.when(
      Stream.async<Command.Command<typeof ChangedSystemTheme>>(emit => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handler = (event: MediaQueryListEvent) => {
          emit.single(
            Effect.succeed(
              ChangedSystemTheme({
                theme: event.matches ? 'Dark' : 'Light',
              }),
            ).pipe(Command.make('ChangeSystemTheme')),
          )
        }

        mediaQuery.addEventListener('change', handler)

        return Effect.sync(() =>
          mediaQuery.removeEventListener('change', handler),
        )
      }),
      () => isSystemPreference,
    ),
}

import { Effect, Stream } from 'effect'
import { Command } from 'foldkit/command'
import { Subscription } from 'foldkit/subscription'

import { ChangedSystemTheme, type Model, type SubscriptionDeps } from '../main'

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
      Stream.async<Command<typeof ChangedSystemTheme>>(emit => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handler = (event: MediaQueryListEvent) => {
          emit.single(
            Effect.succeed(
              ChangedSystemTheme({
                theme: event.matches ? 'Dark' : 'Light',
              }),
            ),
          )
        }

        mediaQuery.addEventListener('change', handler)

        return Effect.sync(() => mediaQuery.removeEventListener('change', handler))
      }),
      () => isSystemPreference,
    ),
}

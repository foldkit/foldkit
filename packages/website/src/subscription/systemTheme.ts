import { Effect, Stream } from 'effect'
import { streamFromEmit } from './streamFromEmit'
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
  dependenciesToStream: ({ isSystemPreference }) =>
    Stream.when(
      streamFromEmit<typeof ChangedSystemTheme.Type>(emit => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handler = (event: MediaQueryListEvent) => {
          emit.single(
            ChangedSystemTheme({
              theme: event.matches ? 'Dark' : 'Light',
            }),
          )
        }

        mediaQuery.addEventListener('change', handler)

        return Effect.sync(() =>
          mediaQuery.removeEventListener('change', handler),
        )
      }),
      Effect.sync(() => isSystemPreference),
    ),
}

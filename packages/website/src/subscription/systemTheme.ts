import { Effect, Queue, Stream } from 'effect'
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
      Stream.callback<typeof ChangedSystemTheme.Type>(queue =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handler = (event: MediaQueryListEvent) => {
              Queue.offerUnsafe(
                queue,
                ChangedSystemTheme({
                  theme: event.matches ? 'Dark' : 'Light',
                }),
              )
            }
            mediaQuery.addEventListener('change', handler)
            return { mediaQuery, handler }
          }),
          ({ mediaQuery, handler }) =>
            Effect.sync(() =>
              mediaQuery.removeEventListener('change', handler),
            ),
        ).pipe(Effect.flatMap(() => Effect.never)),
      ),
      Effect.sync(() => isSystemPreference),
    ),
}

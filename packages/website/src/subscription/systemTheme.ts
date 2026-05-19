import { Effect, Queue, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { type Model } from '../main'
import { ChangedSystemTheme, type Message } from '../message'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  systemTheme: entry(
    { isSystemPreference: S.Boolean },
    {
      modelToDependencies: model => ({
        isSystemPreference: model.themePreference === 'System',
      }),
      dependenciesToStream: ({ isSystemPreference }) =>
        Stream.when(
          Stream.callback<typeof ChangedSystemTheme.Type>(queue =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const mediaQuery = window.matchMedia(
                  '(prefers-color-scheme: dark)',
                )
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
    },
  ),
}))

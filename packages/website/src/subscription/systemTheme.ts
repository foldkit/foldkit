import { Effect, Option, Queue, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from '../message'
import { type Model } from '../model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  systemTheme: entry(
    { isSystemPreference: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isSystemPreference: Option.exists(
          model.maybeThemePreference,
          preference => preference === 'System',
        ),
      }),
      dependenciesToStream: ({ isSystemPreference }) =>
        Stream.when(
          Stream.callback<typeof Message.ChangedSystemTheme.Type>(queue =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const mediaQuery = window.matchMedia(
                  '(prefers-color-scheme: dark)',
                )
                const handler = (event: MediaQueryListEvent) => {
                  Queue.offerUnsafe(
                    queue,
                    Message.ChangedSystemTheme({
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

import { Effect, Queue, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { type Model, NARROW_VIEWPORT_QUERY } from '../main'
import { ChangedViewportWidth, type Message } from '../message'

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  viewportWidth: Subscription.persistent(
    Stream.callback<typeof ChangedViewportWidth.Type>(queue =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const mediaQuery = window.matchMedia(NARROW_VIEWPORT_QUERY)
          const handler = (event: MediaQueryListEvent) => {
            Queue.offerUnsafe(
              queue,
              ChangedViewportWidth({ isNarrow: event.matches }),
            )
          }
          mediaQuery.addEventListener('change', handler)
          return { mediaQuery, handler }
        }),
        ({ mediaQuery, handler }) =>
          Effect.sync(() => mediaQuery.removeEventListener('change', handler)),
      ).pipe(Effect.flatMap(() => Effect.never)),
    ),
  ),
}))

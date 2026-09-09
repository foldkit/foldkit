import { Effect, Queue, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from '../message'
import { type Model } from '../model'
import { NARROW_VIEWPORT_QUERY } from '../viewport'

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  viewportWidth: Subscription.persistent(
    Stream.callback<typeof Message.ChangedViewportWidth.Type>(queue =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const mediaQuery = window.matchMedia(NARROW_VIEWPORT_QUERY)
          const handler = (event: MediaQueryListEvent) => {
            Queue.offerUnsafe(
              queue,
              Message.ChangedViewportWidth({ isNarrow: event.matches }),
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

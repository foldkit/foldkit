import { Effect, Queue, Stream } from 'effect'
import { Subscription } from 'foldkit/subscription'

import {
  type Model,
  NARROW_VIEWPORT_QUERY,
  type SubscriptionDeps,
} from '../main'
import { ChangedViewportWidth } from '../message'

export const viewportWidth: Subscription<
  Model,
  typeof ChangedViewportWidth,
  SubscriptionDeps['viewportWidth']
> = {
  modelToDependencies: () => null,
  dependenciesToStream: () =>
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
}

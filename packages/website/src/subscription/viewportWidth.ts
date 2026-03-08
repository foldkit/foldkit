import { Effect, Stream } from 'effect'
import { Command } from 'foldkit/command'
import { Subscription } from 'foldkit/subscription'

import {
  ChangedViewportWidth,
  type Model,
  NARROW_VIEWPORT_QUERY,
  type SubscriptionDeps,
} from '../main'

export const viewportWidth: Subscription<
  Model,
  typeof ChangedViewportWidth,
  SubscriptionDeps['viewportWidth']
> = {
  modelToDependencies: () => null,
  depsToStream: () =>
    Stream.async<Command<typeof ChangedViewportWidth>>(emit => {
      const mediaQuery = window.matchMedia(NARROW_VIEWPORT_QUERY)

      const handler = (event: MediaQueryListEvent) => {
        emit.single(Effect.succeed(ChangedViewportWidth({ isNarrow: event.matches })))
      }

      mediaQuery.addEventListener('change', handler)

      return Effect.sync(() => mediaQuery.removeEventListener('change', handler))
    }),
}

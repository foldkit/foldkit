import { Effect, Stream } from 'effect'
import { Command } from 'foldkit'
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
  depsToStream: () =>
    Stream.async<Command.Command<typeof ChangedViewportWidth>>(emit => {
      const mediaQuery = window.matchMedia(NARROW_VIEWPORT_QUERY)

      const handler = (event: MediaQueryListEvent) => {
        emit.single(
          Effect.succeed(
            ChangedViewportWidth({ isNarrow: event.matches }),
          ).pipe(Command.make('ChangeViewportWidth')),
        )
      }

      mediaQuery.addEventListener('change', handler)

      return Effect.sync(() =>
        mediaQuery.removeEventListener('change', handler),
      )
    }),
}

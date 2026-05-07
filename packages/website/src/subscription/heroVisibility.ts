import { Effect, Queue, Stream } from 'effect'
import { Task } from 'foldkit'
import { Subscription } from 'foldkit/subscription'

import { type Model, type SubscriptionDeps } from '../main'
import { ChangedHeroVisibility } from '../message'
import { HERO_SECTION_ID } from '../page/landing'

export const heroVisibility: Subscription<
  Model,
  typeof ChangedHeroVisibility,
  SubscriptionDeps['heroVisibility']
> = {
  modelToDependencies: (model: Model) => ({
    isLandingPage: model.route._tag === 'Home',
  }),
  dependenciesToStream: ({ isLandingPage }) =>
    Stream.when(
      Stream.callback<typeof ChangedHeroVisibility.Type>(queue =>
        Effect.gen(function* () {
          yield* Task.afterRender

          const heroElement = document.getElementById(HERO_SECTION_ID)
          if (!heroElement) {
            return yield* Effect.never
          }

          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const observer = new IntersectionObserver(
                entries => {
                  const entry = entries[0]
                  if (entry) {
                    Queue.offerUnsafe(
                      queue,
                      ChangedHeroVisibility({
                        isVisible: entry.isIntersecting,
                      }),
                    )
                  }
                },
                { threshold: 0 },
              )
              observer.observe(heroElement)
              return observer
            }),
            observer => Effect.sync(() => observer.disconnect()),
          )

          return yield* Effect.never
        }),
      ),
      Effect.sync(() => isLandingPage),
    ),
}

import { Effect, Stream } from 'effect'
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
      Stream.async<typeof ChangedHeroVisibility.Type>(emit => {
        const heroElement = document.getElementById(HERO_SECTION_ID)

        if (!heroElement) {
          return Effect.void
        }

        const observer = new IntersectionObserver(
          entries => {
            const entry = entries[0]
            if (entry) {
              emit.single(
                ChangedHeroVisibility({
                  isVisible: entry.isIntersecting,
                }),
              )
            }
          },
          { threshold: 0 },
        )

        observer.observe(heroElement)

        return Effect.sync(() => observer.disconnect())
      }),
      () => isLandingPage,
    ),
}

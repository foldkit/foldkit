import { Duration, Effect, Queue, Stream } from 'effect'
import { Render } from 'foldkit'
import { Subscription } from 'foldkit/subscription'

import { type Model, type SubscriptionDependencies } from '../main'
import { ScrolledSidebar } from '../message'
import { routeHasSidebar } from '../route'
import { DOCS_SIDEBAR_NAV_ID } from '../view/sidebar'

const DEBOUNCE_DURATION = Duration.millis(150)

export const sidebarScroll: Subscription<
  Model,
  typeof ScrolledSidebar,
  SubscriptionDependencies['sidebarScroll']
> = {
  modelToDependencies: (model: Model) => ({
    hasSidebar: routeHasSidebar(model.route),
  }),
  dependenciesToStream: ({ hasSidebar }) =>
    Stream.when(
      Stream.callback<typeof ScrolledSidebar.Type>(queue =>
        Effect.gen(function* () {
          yield* Render.afterCommit

          const sidebarNav = document.getElementById(DOCS_SIDEBAR_NAV_ID)
          if (!(sidebarNav instanceof HTMLElement)) {
            return yield* Effect.never
          }

          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const handleScroll = () => {
                Queue.offerUnsafe(
                  queue,
                  ScrolledSidebar({ scroll: sidebarNav.scrollTop }),
                )
              }
              sidebarNav.addEventListener('scroll', handleScroll, {
                passive: true,
              })
              return handleScroll
            }),
            handleScroll =>
              Effect.sync(() => {
                sidebarNav.removeEventListener('scroll', handleScroll)
              }),
          )

          return yield* Effect.never
        }),
      ).pipe(Stream.debounce(DEBOUNCE_DURATION)),
      Effect.sync(() => hasSidebar),
    ),
}

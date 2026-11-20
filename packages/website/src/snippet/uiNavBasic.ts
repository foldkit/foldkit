// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, Message, update,
// and view definitions.
import { Match, Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineRouteUnion, literal } from 'foldkit/route'

import { Nav } from '@foldkit/ui'

// Your app's routes. A Playlist page belongs to the Library section:
const AppRoute = defineRouteUnion({
  Home: {},
  Search: {},
  Library: {},
  Playlist: { playlistId: Schema.String },
  Profile: {},
  NotFound: { path: Schema.String },
})

type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
const searchRouter = pipe(literal('search'), Route.mapTo(AppRoute.Search))
const libraryRouter = pipe(literal('library'), Route.mapTo(AppRoute.Library))
const profileRouter = pipe(literal('profile'), Route.mapTo(AppRoute.Profile))

// Nav is stateless: the current destination comes from the URL, so there is
// no Nav.Model to store and no Nav.update to delegate to. Your app already
// holds the active route in its Model:
const Model = Schema.Struct({
  route: AppRoute,
  // ...your other fields
})

type Model = typeof Model.Type

// The nav items are the sections you navigate between. Declare them as a
// Schema so the item list and the Section type come from one definition,
// and toView can switch on the item value without casting:
const Section = Schema.Literals(['Home', 'Search', 'Library', 'Profile'])

type Section = typeof Section.Type

// Map each section to its URL with your routers, and decide which section is
// current from the active route. A section can own a whole family of routes,
// so this is a predicate over the route rather than an equality check:
const sectionToHref = (section: Section): string =>
  Match.value(section).pipe(
    Match.when('Home', () => homeRouter()),
    Match.when('Search', () => searchRouter()),
    Match.when('Library', () => libraryRouter()),
    Match.when('Profile', () => profileRouter()),
    Match.exhaustive,
  )

const isSectionCurrent =
  (route: AppRoute) =>
  (section: Section): boolean =>
    Match.value(section).pipe(
      Match.when('Home', () => AppRoute.guards.Home(route)),
      Match.when('Search', () => AppRoute.guards.Search(route)),
      Match.when('Library', () =>
        AppRoute.isAnyOf(['Library', 'Playlist'])(route),
      ),
      Match.when('Profile', () => AppRoute.guards.Profile(route)),
      Match.exhaustive,
    )

// Inside your view function, render the nav. Spread the nav bundle onto an
// h.nav landmark and each item.link bundle onto an h.a. The current item
// carries aria-current="page" and a data-current attribute for styling.
// Browser-native Tab and Enter handle keyboard navigation; Foldkit's runtime
// turns the link clicks into route changes:
const view = (model: Model, h: HtmlBuilder<Message>) => {
  const navView = ({ nav, items }: Nav.RenderInfo<Section>) =>
    h.nav(
      [...nav, h.Class('flex gap-2')],
      items.map(item =>
        h.a(
          [
            ...item.link,
            h.Class(
              'px-4 py-2 rounded-lg text-gray-500 data-[current]:bg-gray-100 data-[current]:text-gray-900',
            ),
          ],
          [h.span([], [item.value])],
        ),
      ),
    )

  return Nav.view<Section>({
    items: Section.literals,
    ariaLabel: 'Primary',
    toHref: sectionToHref,
    isItemCurrent: isSectionCurrent(model.route),
    toView: navView,
  })
}

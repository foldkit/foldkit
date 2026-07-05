// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, Message, update,
// and view definitions.
import { Match as M } from 'effect'
import { html } from 'foldkit/html'

import { Nav } from '@foldkit/ui'

// Nav is stateless: the current destination comes from the URL, so there is
// no Nav.Model to store and no Nav.update to delegate to. Your app already
// holds the active route in its Model:
const Model = S.Struct({
  route: AppRoute,
  // ...your other fields
})

// The nav items are the sections you navigate between. Use the route tags as
// the item values so toView can switch on them without casting:
type Section = 'Home' | 'Search' | 'Library' | 'Profile'

const sections: ReadonlyArray<Section> = [
  'Home',
  'Search',
  'Library',
  'Profile',
]

// Map each section to its URL with your routers, and decide which section is
// current from the active route. A section can own a whole family of routes,
// so this is a predicate rather than an equality check:
const sectionToHref = (section: Section): string =>
  M.value(section).pipe(
    M.when('Home', () => homeRouter()),
    M.when('Search', () => searchRouter()),
    M.when('Library', () => libraryRouter()),
    M.when('Profile', () => profileRouter()),
    M.exhaustive,
  )

const isSectionCurrent =
  (route: AppRoute) =>
  (section: Section): boolean =>
    sectionToRouteTag(section) === route._tag

// Inside your view function, render the nav. Spread the nav bundle onto an
// h.nav landmark and each item.link bundle onto an h.a. The current item
// carries aria-current="page" and a data-current attribute for styling.
// Browser-native Tab and Enter handle keyboard navigation; Foldkit's runtime
// turns the link clicks into route changes:
const view = (model: Model) => {
  const h = html<Message>()

  return Nav.view<Section>({
    items: sections,
    ariaLabel: 'Primary',
    toHref: sectionToHref,
    isItemCurrent: isSectionCurrent(model.route),
    toView: ({ nav, items }) =>
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
      ),
  })
}

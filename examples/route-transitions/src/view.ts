import { Array, Match, Option } from 'effect'
import { Html } from 'foldkit/html'
import { Transition } from 'foldkit/route'

import { ApplicationComposition } from './composition'
import type { ApplicationViewBuilder } from './composition'
import { type Painting, findPaintingWithIndex, paintings } from './data'
import { Message } from './message'
import {
  type CatalogStatus,
  type LoggedTransition,
  type PaintingStatus,
} from './model'
import {
  ApplicationRoute,
  galleryRouter,
  homeRouter,
  paintingRouter,
  studioRouter,
} from './route'
import type { AppTransition } from './steps'

const routeLabel = (route: ApplicationRoute): string =>
  ApplicationRoute.match(route, {
    Home: () => 'Home',
    Gallery: () => 'Gallery',
    Painting: ({ paintingId }) => `Painting ${paintingId}`,
    Studio: () => 'Studio',
    NotFound: () => 'Not found',
  })

const navigationView = (
  currentRoute: ApplicationRoute,
  h: ApplicationViewBuilder,
): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `font-medium px-3 py-1 rounded transition hover:bg-indigo-500 ${isActive ? 'bg-indigo-700' : ''}`

  return h.nav(
    [h.Class('bg-indigo-600 text-white p-4')],
    [
      h.ul(
        [h.Class('max-w-6xl mx-auto flex gap-4 list-none')],
        [
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(homeRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Home')),
                ],
                ['Home'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(galleryRouter()),
                  h.Class(
                    navLinkClassName(
                      currentRoute._tag === 'Gallery' ||
                        currentRoute._tag === 'Painting',
                    ),
                  ),
                ],
                ['Gallery'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(studioRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Studio')),
                ],
                ['Studio'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const homeView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-gray-800 mb-6')],
        ['Route Transitions'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [
          'Every navigation in this app is described by the Transition helpers from foldkit/route, and the log on the right narrates what each one said. The cold load that brought you here is already in it.',
        ],
      ),
      h.p([h.Class('text-gray-600 mb-2')], ['Things to try:']),
      h.ul(
        [h.Class('list-disc pl-6 text-gray-600 space-y-2')],
        [
          h.li(
            [],
            [
              'Open the Gallery. Entering it fires a catalog load once; navigating back and forth fires it again only on each fresh entry.',
            ],
          ),
          h.li(
            [],
            [
              'Open a painting and flip to the next one. Staying on the Painting route is not an entry, so the log shows a stayed transition and only the changed id refetches.',
            ],
          ),
          h.li(
            [],
            [
              'Write a draft in the Studio and leave. Exiting the route is a fact, and it becomes a one-shot save Command.',
            ],
          ),
          h.li(
            [],
            [
              'Reload the page anywhere. A cold load has no previous route and still counts as an entry.',
            ],
          ),
        ],
      ),
    ],
  )

const loadingView = (label: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [
      h.Class(
        'border border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500',
      ),
    ],
    [label],
  )

const paintingGridView = (h: ApplicationViewBuilder): Html =>
  h.ul(
    [h.Class('grid gap-4 sm:grid-cols-2 list-none')],
    Array.map(paintings, painting =>
      h.keyed('li')(
        String(painting.id),
        [],
        [
          h.a(
            [
              h.Href(paintingRouter({ paintingId: painting.id })),
              h.Class(
                'block bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden',
              ),
            ],
            [
              h.div([h.Class(`h-28 bg-gradient-to-br ${painting.gradient}`)]),
              h.div(
                [h.Class('p-4')],
                [
                  h.h3(
                    [h.Class('font-semibold text-gray-800')],
                    [painting.title],
                  ),
                  h.p([h.Class('text-sm text-gray-500')], [painting.artist]),
                ],
              ),
            ],
          ),
        ],
      ),
    ),
  )

const galleryView = (
  catalogStatus: CatalogStatus,
  h: ApplicationViewBuilder,
): Html => {
  const isCatalogReady = catalogStatus === 'Ready'

  return h.div(
    [],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-2')], ['Gallery']),
      h.p(
        [h.Class('text-gray-600 mb-6')],
        [
          'The catalog loads when a transition enters this route, whether by navigation or by cold load.',
        ],
      ),
      isCatalogReady
        ? paintingGridView(h)
        : loadingView('Hanging the paintings…', h),
    ],
  )
}

const neighborView = (
  label: string,
  maybeNeighbor: Option.Option<Painting>,
  h: ApplicationViewBuilder,
): Html =>
  Option.match(maybeNeighbor, {
    onNone: () => h.span([h.Class('text-gray-300')], [label]),
    onSome: neighbor =>
      h.a(
        [
          h.Href(paintingRouter({ paintingId: neighbor.id })),
          h.Class('text-indigo-600 hover:underline font-medium'),
        ],
        [label],
      ),
  })

const paintingNeighborsView = (
  paintingIndex: number,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class('flex items-center justify-between mt-6')],
    [
      neighborView('← Previous', Array.get(paintings, paintingIndex - 1), h),
      h.span(
        [h.Class('text-sm text-gray-500')],
        [`${paintingIndex + 1} of ${paintings.length}`],
      ),
      neighborView('Next →', Array.get(paintings, paintingIndex + 1), h),
    ],
  )

const missingPaintingView = (
  paintingId: number,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-red-600 mb-6')],
        ['Painting Not Found'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`No painting with id ${paintingId} hangs in this gallery.`],
      ),
      h.a(
        [h.Href(galleryRouter()), h.Class('text-indigo-600 hover:underline')],
        ['← Back to Gallery'],
      ),
    ],
  )

const foundPaintingView = (
  painting: Painting,
  paintingIndex: number,
  paintingStatus: PaintingStatus,
  h: ApplicationViewBuilder,
): Html => {
  const isPaintingReady =
    paintingStatus._tag === 'Ready' && paintingStatus.paintingId === painting.id

  return h.div(
    [],
    [
      h.a(
        [
          h.Href(galleryRouter()),
          h.Class('text-indigo-600 hover:underline mb-4 inline-block'),
        ],
        ['← Back to Gallery'],
      ),
      isPaintingReady
        ? h.article(
            [h.Class('bg-white rounded-lg shadow overflow-hidden')],
            [
              h.div([h.Class(`h-56 bg-gradient-to-br ${painting.gradient}`)]),
              h.div(
                [h.Class('p-6')],
                [
                  h.h1(
                    [h.Class('text-3xl font-bold text-gray-800 mb-1')],
                    [painting.title],
                  ),
                  h.p([h.Class('text-gray-500')], [painting.artist]),
                ],
              ),
            ],
          )
        : loadingView('Unpacking the painting…', h),
      paintingNeighborsView(paintingIndex, h),
    ],
  )
}

const paintingView = (
  paintingId: number,
  paintingStatus: PaintingStatus,
  h: ApplicationViewBuilder,
): Html =>
  Option.match(findPaintingWithIndex(paintingId), {
    onNone: () => missingPaintingView(paintingId, h),
    onSome: ({ painting, paintingIndex }) =>
      foundPaintingView(painting, paintingIndex, paintingStatus, h),
  })

const studioView = (
  studioDraft: string,
  maybeSavedDraft: Option.Option<string>,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-2')], ['Studio']),
      h.p(
        [h.Class('text-gray-600 mb-6')],
        [
          'Write something, then leave. Exiting this route fires a one-shot SaveDraft Command with whatever is here.',
        ],
      ),
      h.textarea([
        h.Value(studioDraft),
        h.OnInput(value => Message.UpdatedStudioDraft({ value })),
        h.Placeholder('A half-finished thought…'),
        h.Class(
          'w-full h-40 bg-white border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500',
        ),
      ]),
      h.div(
        [h.Class('mt-6')],
        [
          Option.match(maybeSavedDraft, {
            onNone: () =>
              h.p([h.Class('text-sm text-gray-500')], ['Nothing saved yet.']),
            onSome: savedDraft =>
              h.div(
                [h.Class('bg-white border border-gray-200 rounded-lg p-4')],
                [
                  h.h2(
                    [
                      h.Class(
                        'text-sm font-medium text-gray-500 uppercase tracking-wide mb-1',
                      ),
                    ],
                    ['Last saved draft'],
                  ),
                  h.p([h.Class('text-gray-800')], [savedDraft]),
                ],
              ),
          }),
        ],
      ),
    ],
  )

const notFoundView = (path: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [h.Href(homeRouter()), h.Class('text-indigo-600 hover:underline')],
        ['← Go Home'],
      ),
    ],
  )

const badgeView = (
  className: string,
  label: string,
  h: ApplicationViewBuilder,
): Html =>
  h.span(
    [
      h.Class(
        `text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${className}`,
      ),
    ],
    [label],
  )

const logEntryBadges = (
  transition: AppTransition,
  h: ApplicationViewBuilder,
): ReadonlyArray<Html> => {
  const coldLoadBadges = Option.match(transition.maybePreviousRoute, {
    onNone: () => [badgeView('bg-violet-100 text-violet-700', 'Cold load', h)],
    onSome: () => [],
  })

  const maybeEnteredBadge = Option.map(
    Transition.enteredAny(transition),
    route =>
      badgeView('bg-emerald-100 text-emerald-700', `Entered ${route._tag}`, h),
  )

  const maybeExitedBadge = Option.map(Transition.exitedAny(transition), route =>
    badgeView('bg-amber-100 text-amber-700', `Exited ${route._tag}`, h),
  )

  const maybeStayedBadge = Option.map(
    Transition.stayed(transition, 'Painting'),
    ({ previousRoute, nextRoute }) =>
      badgeView(
        'bg-sky-100 text-sky-700',
        `Stayed on Painting: ${previousRoute.paintingId} → ${nextRoute.paintingId}`,
        h,
      ),
  )

  const helperBadges = Array.getSomes([
    maybeEnteredBadge,
    maybeExitedBadge,
    maybeStayedBadge,
  ])

  return Array.match([...coldLoadBadges, ...helperBadges], {
    onEmpty: () => [
      badgeView('bg-gray-100 text-gray-600', 'Stayed within route', h),
    ],
    onNonEmpty: badges => badges,
  })
}

const logEntryView = (
  entry: LoggedTransition,
  h: ApplicationViewBuilder,
): Html => {
  const sourceLabel = Option.match(entry.maybePreviousRoute, {
    onNone: () => 'Cold load',
    onSome: routeLabel,
  })

  return h.keyed('li')(
    String(entry.sequenceNumber),
    [h.Class('border border-gray-200 rounded-md p-3')],
    [
      h.p(
        [h.Class('text-xs text-gray-500 mb-2')],
        [
          `#${entry.sequenceNumber} ${sourceLabel} → ${routeLabel(entry.nextRoute)}`,
        ],
      ),
      h.div([h.Class('flex flex-wrap gap-1.5')], logEntryBadges(entry, h)),
    ],
  )
}

const transitionLogView = (
  transitionLog: ReadonlyArray<LoggedTransition>,
  h: ApplicationViewBuilder,
): Html =>
  h.aside(
    [h.Class('bg-white rounded-lg shadow p-4 h-fit lg:sticky lg:top-8')],
    [
      h.h2(
        [h.Class('text-lg font-bold text-gray-800 mb-1')],
        ['Transition Log'],
      ),
      h.p(
        [h.Class('text-sm text-gray-500 mb-4')],
        ['The most recent navigations, described by the Transition helpers.'],
      ),
      h.ul(
        [h.Class('space-y-3 list-none')],
        Array.map(transitionLog, entry => logEntryView(entry, h)),
      ),
    ],
  )

const routeTitle = (route: ApplicationRoute): string =>
  Match.value(route).pipe(
    Match.tag('Home', () => 'Route Transitions'),
    Match.orElse(
      currentRoute => `${routeLabel(currentRoute)} | Route Transitions`,
    ),
  )

export const view = ApplicationComposition.makeView((model, h) => {
  const routeContent = ApplicationRoute.match(model.route, {
    Home: () => homeView(h),
    Gallery: () => galleryView(model.catalogStatus, h),
    Painting: ({ paintingId }) =>
      paintingView(paintingId, model.paintingStatus, h),
    Studio: () => studioView(model.studioDraft, model.maybeSavedDraft, h),
    NotFound: ({ path }) => notFoundView(path, h),
  })

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-gray-100')],
      [
        h.header([], [navigationView(model.route, h)]),
        h.main(
          [
            h.Class(
              'max-w-6xl mx-auto px-4 py-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] items-start',
            ),
          ],
          [routeContent, transitionLogView(model.transitionLog, h)],
        ),
      ],
    ),
  }
})

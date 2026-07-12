import {
  Array,
  Duration,
  Effect,
  Match as M,
  Option,
  Schema as S,
  pipe,
} from 'effect'
import { Command, Runtime, Update } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { type Painting, findPaintingWithIndex, paintings } from './data'
import {
  AppRoute,
  galleryRouter,
  homeRouter,
  paintingRouter,
  studioRouter,
  urlToAppRoute,
} from './route'

export {
  AppRoute,
  GalleryRoute,
  HomeRoute,
  NotFoundRoute,
  PaintingRoute,
  StudioRoute,
} from './route'

const CATALOG_LATENCY = Duration.millis(600)
const PAINTING_LATENCY = Duration.millis(400)
const SAVE_LATENCY = Duration.millis(300)
const MAX_LOGGED_TRANSITIONS = 20

// MODEL

export const CatalogStatus = S.Literals(['Idle', 'Loading', 'Ready'])
export type CatalogStatus = typeof CatalogStatus.Type

export const PaintingIdle = ts('PaintingIdle')
export const PaintingLoading = ts('PaintingLoading', { paintingId: S.Number })
export const PaintingReady = ts('PaintingReady', { paintingId: S.Number })

export const PaintingStatus = S.Union([
  PaintingIdle,
  PaintingLoading,
  PaintingReady,
])
export type PaintingStatus = typeof PaintingStatus.Type

export const LoggedTransition = S.Struct({
  sequenceNumber: S.Number,
  maybePreviousRoute: S.Option(AppRoute),
  nextRoute: AppRoute,
})
export type LoggedTransition = typeof LoggedTransition.Type

export const Model = S.Struct({
  route: AppRoute,
  transitionLog: S.Array(LoggedTransition),
  catalogStatus: CatalogStatus,
  paintingStatus: PaintingStatus,
  studioDraft: S.String,
  maybeSavedDraft: S.Option(S.String),
})
export type Model = typeof Model.Type

// MESSAGE

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const ClickedLink = m('ClickedLink', { request: UrlRequest })
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const SucceededLoadCatalog = m('SucceededLoadCatalog')
export const SucceededLoadPainting = m('SucceededLoadPainting', {
  paintingId: S.Number,
})
export const UpdatedStudioDraft = m('UpdatedStudioDraft', { value: S.String })
export const SucceededSaveDraft = m('SucceededSaveDraft', { draft: S.String })

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  SucceededLoadCatalog,
  SucceededLoadPainting,
  UpdatedStudioDraft,
  SucceededSaveDraft,
])
export type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define(
  'NavigateInternal',
  { url: S.String },
  CompletedNavigateInternal,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())))

const LoadExternal = Command.define(
  'LoadExternal',
  { href: S.String },
  CompletedLoadExternal,
)(({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())))

export const LoadCatalog = Command.define(
  'LoadCatalog',
  SucceededLoadCatalog,
)(Effect.sleep(CATALOG_LATENCY).pipe(Effect.as(SucceededLoadCatalog())))

export const LoadPainting = Command.define(
  'LoadPainting',
  { paintingId: S.Number },
  SucceededLoadPainting,
)(({ paintingId }) =>
  Effect.sleep(PAINTING_LATENCY).pipe(
    Effect.as(SucceededLoadPainting({ paintingId })),
  ),
)

export const SaveDraft = Command.define(
  'SaveDraft',
  { draft: S.String },
  SucceededSaveDraft,
)(({ draft }) =>
  Effect.sleep(SAVE_LATENCY).pipe(Effect.as(SucceededSaveDraft({ draft }))),
)

// UPDATE

type UpdateReturn = Update.Return<Model, Message>
type Step = Update.Step<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export type AppTransition = Transition.Transition<AppRoute>

const nextSequenceNumber = (
  transitionLog: ReadonlyArray<LoggedTransition>,
): number =>
  Option.match(Array.head(transitionLog), {
    onNone: () => 1,
    onSome: newestEntry => newestEntry.sequenceNumber + 1,
  })

const logTransition =
  (transition: AppTransition): Step =>
  model => [
    evo(model, {
      transitionLog: transitionLog =>
        pipe(
          transitionLog,
          Array.prepend({
            sequenceNumber: nextSequenceNumber(transitionLog),
            maybePreviousRoute: transition.maybePreviousRoute,
            nextRoute: transition.nextRoute,
          }),
          Array.take(MAX_LOGGED_TRANSITIONS),
        ),
    }),
    [],
  ]

const loadCatalogOnGalleryEntry =
  (transition: AppTransition): Step =>
  model =>
    Transition.isEntering(transition, 'Gallery') &&
    model.catalogStatus !== 'Loading'
      ? [evo(model, { catalogStatus: () => 'Loading' }), [LoadCatalog()]]
      : [model, []]

const loadPaintingOnEntry =
  (transition: AppTransition): Step =>
  model =>
    Option.match(Transition.enteredRoute(transition, 'Painting'), {
      onNone: () => [model, []],
      onSome: ({ paintingId }) => [
        evo(model, { paintingStatus: () => PaintingLoading({ paintingId }) }),
        [LoadPainting({ paintingId })],
      ],
    })

const reloadPaintingOnIdChange =
  (transition: AppTransition): Step =>
  model =>
    Option.match(Transition.stayed(transition, 'Painting'), {
      onNone: () => [model, []],
      onSome: ({ previousRoute, nextRoute }) =>
        previousRoute.paintingId === nextRoute.paintingId
          ? [model, []]
          : [
              evo(model, {
                paintingStatus: () =>
                  PaintingLoading({ paintingId: nextRoute.paintingId }),
              }),
              [LoadPainting({ paintingId: nextRoute.paintingId })],
            ],
    })

const saveDraftOnStudioExit =
  (transition: AppTransition): Step =>
  model =>
    Option.match(Transition.exitedRoute(transition, 'Studio'), {
      onNone: () => [model, []],
      onSome: () =>
        model.studioDraft === ''
          ? [model, []]
          : [model, [SaveDraft({ draft: model.studioDraft })]],
    })

const handleTransition = (
  model: Model,
  transition: AppTransition,
): UpdateReturn =>
  Update.combine(model, [
    logTransition(transition),
    loadCatalogOnGalleryEntry(transition),
    loadPaintingOnEntry(transition),
    reloadPaintingOnIdChange(transition),
    saveDraftOnStudioExit(transition),
  ])

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedNavigateInternal: () => [model, []],
      CompletedLoadExternal: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [NavigateInternal({ url: urlToString(url) })],
            ],
            External: ({ href }) => [model, [LoadExternal({ href })]],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const nextRoute = urlToAppRoute(url)
        const transition = Transition.make(model.route, nextRoute)
        return handleTransition(
          evo(model, { route: () => nextRoute }),
          transition,
        )
      },

      SucceededLoadCatalog: () => [
        evo(model, { catalogStatus: () => 'Ready' }),
        [],
      ],

      SucceededLoadPainting: ({ paintingId }) =>
        model.paintingStatus._tag === 'PaintingLoading' &&
        model.paintingStatus.paintingId === paintingId
          ? [
              evo(model, {
                paintingStatus: () => PaintingReady({ paintingId }),
              }),
              [],
            ]
          : [model, []],

      UpdatedStudioDraft: ({ value }) => [
        evo(model, { studioDraft: () => value }),
        [],
      ],

      SucceededSaveDraft: ({ draft }) => [
        evo(model, { maybeSavedDraft: () => Option.some(draft) }),
        [],
      ],
    }),
  )

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = (
  url: Url,
) => {
  const route = urlToAppRoute(url)
  const initialModel = Model.make({
    route,
    transitionLog: [],
    catalogStatus: 'Idle',
    paintingStatus: PaintingIdle(),
    studioDraft: '',
    maybeSavedDraft: Option.none(),
  })
  return handleTransition(initialModel, Transition.coldLoad(route))
}

// VIEW

const routeLabel = (route: AppRoute): string =>
  M.value(route).pipe(
    M.tagsExhaustive({
      Home: () => 'Home',
      Gallery: () => 'Gallery',
      Painting: ({ paintingId }) => `Painting ${paintingId}`,
      Studio: () => 'Studio',
      NotFound: () => 'Not found',
    }),
  )

const navigationView = (currentRoute: AppRoute): Html => {
  const h = html<Message>()

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

const homeView = (): Html => {
  const h = html<Message>()

  return h.div(
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
}

const loadingView = (label: string): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'border border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500',
      ),
    ],
    [label],
  )
}

const paintingGridView = (): Html => {
  const h = html<Message>()

  return h.ul(
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
              h.div(
                [h.Class(`h-28 bg-gradient-to-br ${painting.gradient}`)],
                [],
              ),
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
}

const galleryView = (catalogStatus: CatalogStatus): Html => {
  const h = html<Message>()

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
        ? paintingGridView()
        : loadingView('Hanging the paintings…'),
    ],
  )
}

const neighborView = (
  label: string,
  maybeNeighbor: Option.Option<Painting>,
): Html => {
  const h = html<Message>()

  return Option.match(maybeNeighbor, {
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
}

const paintingNeighborsView = (paintingIndex: number): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('flex items-center justify-between mt-6')],
    [
      neighborView('← Previous', Array.get(paintings, paintingIndex - 1)),
      h.span(
        [h.Class('text-sm text-gray-500')],
        [`${paintingIndex + 1} of ${paintings.length}`],
      ),
      neighborView('Next →', Array.get(paintings, paintingIndex + 1)),
    ],
  )
}

const missingPaintingView = (paintingId: number): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    'Missing',
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
}

const foundPaintingView = (
  painting: Painting,
  paintingIndex: number,
  paintingStatus: PaintingStatus,
): Html => {
  const h = html<Message>()

  const isPaintingReady =
    paintingStatus._tag === 'PaintingReady' &&
    paintingStatus.paintingId === painting.id

  return h.keyed('div')(
    'Found',
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
              h.div(
                [h.Class(`h-56 bg-gradient-to-br ${painting.gradient}`)],
                [],
              ),
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
        : loadingView('Unpacking the painting…'),
      paintingNeighborsView(paintingIndex),
    ],
  )
}

const paintingView = (
  paintingId: number,
  paintingStatus: PaintingStatus,
): Html =>
  Option.match(findPaintingWithIndex(paintingId), {
    onNone: () => missingPaintingView(paintingId),
    onSome: ({ painting, paintingIndex }) =>
      foundPaintingView(painting, paintingIndex, paintingStatus),
  })

const studioView = (
  studioDraft: string,
  maybeSavedDraft: Option.Option<string>,
): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-2')], ['Studio']),
      h.p(
        [h.Class('text-gray-600 mb-6')],
        [
          'Write something, then leave. Exiting this route fires a one-shot SaveDraft Command with whatever is here.',
        ],
      ),
      h.textarea(
        [
          h.Value(studioDraft),
          h.OnInput(value => UpdatedStudioDraft({ value })),
          h.Placeholder('A half-finished thought…'),
          h.Class(
            'w-full h-40 bg-white border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500',
          ),
        ],
        [],
      ),
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
}

const notFoundView = (path: string): Html => {
  const h = html<Message>()

  return h.div(
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
}

const badgeView = (className: string, label: string): Html => {
  const h = html<Message>()

  return h.span(
    [
      h.Class(
        `text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${className}`,
      ),
    ],
    [label],
  )
}

const logEntryBadges = (transition: AppTransition): ReadonlyArray<Html> => {
  const coldLoadBadges = Option.match(transition.maybePreviousRoute, {
    onNone: () => [badgeView('bg-violet-100 text-violet-700', 'Cold load')],
    onSome: () => [],
  })

  const maybeEnteredBadge = Option.map(Transition.entered(transition), route =>
    badgeView('bg-emerald-100 text-emerald-700', `Entered ${route._tag}`),
  )

  const maybeExitedBadge = Option.map(Transition.exited(transition), route =>
    badgeView('bg-amber-100 text-amber-700', `Exited ${route._tag}`),
  )

  const maybeStayedBadge = Option.map(
    Transition.stayed(transition, 'Painting'),
    ({ previousRoute, nextRoute }) =>
      badgeView(
        'bg-sky-100 text-sky-700',
        `Stayed on Painting: ${previousRoute.paintingId} → ${nextRoute.paintingId}`,
      ),
  )

  const helperBadges = Array.getSomes([
    maybeEnteredBadge,
    maybeExitedBadge,
    maybeStayedBadge,
  ])

  return Array.match([...coldLoadBadges, ...helperBadges], {
    onEmpty: () => [
      badgeView('bg-gray-100 text-gray-600', 'Stayed within route'),
    ],
    onNonEmpty: badges => badges,
  })
}

const logEntryView = (entry: LoggedTransition): Html => {
  const h = html<Message>()

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
      h.div([h.Class('flex flex-wrap gap-1.5')], logEntryBadges(entry)),
    ],
  )
}

const transitionLogView = (
  transitionLog: ReadonlyArray<LoggedTransition>,
): Html => {
  const h = html<Message>()

  return h.aside(
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
        Array.map(transitionLog, logEntryView),
      ),
    ],
  )
}

const routeTitle = (route: AppRoute): string =>
  M.value(route).pipe(
    M.tag('Home', () => 'Route Transitions'),
    M.orElse(currentRoute => `${routeLabel(currentRoute)} | Route Transitions`),
  )

export const view = (model: Model): Document => {
  const h = html<Message>()

  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: homeView,
      Gallery: () => galleryView(model.catalogStatus),
      Painting: ({ paintingId }) =>
        paintingView(paintingId, model.paintingStatus),
      Studio: () => studioView(model.studioDraft, model.maybeSavedDraft),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-gray-100')],
      [
        h.header([], [navigationView(model.route)]),
        h.main(
          [
            h.Class(
              'max-w-6xl mx-auto px-4 py-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] items-start',
            ),
          ],
          [
            h.keyed('div')(model.route._tag, [], [routeContent]),
            transitionLogView(model.transitionLog),
          ],
        ),
      ],
    ),
  }
}

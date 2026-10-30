import { Array, Duration, Effect, Match, Option, Schema, pipe } from 'effect'
import { Block, Command, Route } from 'foldkit'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import {
  Transition,
  defineRouteUnion,
  int,
  literal,
  slash,
} from 'foldkit/route'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

// ROUTE

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  Gallery: {},
  Painting: { paintingId: Schema.Number },
  Studio: {},
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))

const galleryRouter = pipe(
  literal('gallery'),
  Route.mapTo(ApplicationRoute.Gallery),
)

const paintingRouter = pipe(
  literal('gallery'),
  slash(int('paintingId')),
  Route.mapTo(ApplicationRoute.Painting),
)

const studioRouter = pipe(
  literal('studio'),
  Route.mapTo(ApplicationRoute.Studio),
)

const routeParser = Route.oneOf(
  paintingRouter,
  galleryRouter,
  studioRouter,
  homeRouter,
)

const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

// DATA

const Painting = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  artist: Schema.String,
  gradient: Schema.String,
})
type Painting = typeof Painting.Type

const paintings: ReadonlyArray<Painting> = [
  {
    id: 1,
    title: 'Dawn Over the Harbor',
    artist: 'Mara Ellsworth',
    gradient: 'from-rose-300 via-amber-200 to-sky-300',
  },
  {
    id: 2,
    title: 'Static in Bloom',
    artist: 'Jun Okabe',
    gradient: 'from-fuchsia-400 via-purple-300 to-indigo-400',
  },
  {
    id: 3,
    title: 'Winter Circuit',
    artist: 'Ada Lindqvist',
    gradient: 'from-slate-300 via-cyan-200 to-blue-400',
  },
  {
    id: 4,
    title: 'Ferric Meadow',
    artist: 'Tomás Reyes',
    gradient: 'from-lime-300 via-emerald-300 to-teal-400',
  },
  {
    id: 5,
    title: 'Ultraviolet Tide',
    artist: 'Nadia Boulos',
    gradient: 'from-indigo-400 via-violet-400 to-pink-300',
  },
  {
    id: 6,
    title: 'Ember Study No. 4',
    artist: 'Hal Whitaker',
    gradient: 'from-orange-400 via-red-300 to-rose-400',
  },
]

const findPaintingWithIndex = (
  paintingId: number,
): Option.Option<Readonly<{ painting: Painting; paintingIndex: number }>> =>
  pipe(
    Array.findFirstIndex(paintings, painting => painting.id === paintingId),
    Option.flatMap(paintingIndex =>
      Option.map(Array.get(paintings, paintingIndex), painting => ({
        painting,
        paintingIndex,
      })),
    ),
  )

// MODEL

const CatalogStatus = Schema.Literals(['Idle', 'Loading', 'Ready'])
type CatalogStatus = typeof CatalogStatus.Type

export const PaintingStatus = defineTaggedUnion({
  Idle: {},
  Loading: { paintingId: Schema.Number },
  Ready: { paintingId: Schema.Number },
})
export type PaintingStatus = typeof PaintingStatus.Type

const LoggedTransition = Schema.Struct({
  sequenceNumber: Schema.Number,
  maybePreviousRoute: Schema.Option(ApplicationRoute),
  nextRoute: ApplicationRoute,
})
type LoggedTransition = typeof LoggedTransition.Type

export const Model = Schema.Struct({
  route: ApplicationRoute,
  transitionLog: Schema.Array(LoggedTransition),
  catalogStatus: CatalogStatus,
  paintingStatus: PaintingStatus,
  studioDraft: Schema.String,
  maybeSavedDraft: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedLoadCatalog: {},
  CompletedLoadPainting: { paintingId: Schema.Number },
  UpdatedStudioDraft: { value: Schema.String },
  CompletedSaveDraft: { draft: Schema.String },
})
export type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

export const LoadCatalog = Command.define('LoadCatalog', {
  messages: [Message.CompletedLoadCatalog],
})

export const LoadPainting = Command.define('LoadPainting', {
  args: { paintingId: Schema.Number },
  messages: [Message.CompletedLoadPainting],
})

export const SaveDraft = Command.define('SaveDraft', {
  args: { draft: Schema.String },
  messages: [Message.CompletedSaveDraft],
})

type ApplicationCommand =
  | ReturnType<typeof NavigateInternal>
  | ReturnType<typeof LoadExternal>
  | ReturnType<typeof LoadCatalog>
  | ReturnType<typeof LoadPainting>
  | ReturnType<typeof SaveDraft>

const CATALOG_LATENCY = Duration.millis(600)
const PAINTING_LATENCY = Duration.millis(400)
const SAVE_LATENCY = Duration.millis(300)

export class Application extends Block<Application, Readonly<{ url: Url }>>()(
  'Application',
  {
    Model,
    Message,
    Command: [
      NavigateInternal,
      LoadExternal,
      LoadCatalog,
      LoadPainting,
      SaveDraft,
    ],
  },
) {}

// LIVE

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const init_ = init(url)

    return {
      model: init_.model,
      start: init_.commands ?? [],

      update: {
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),

        ClickedLink: (model, { request }) =>
          UrlRequest.match(request, {
            Internal: ({ url }) => ({
              model,
              commands: [NavigateInternal({ url: urlToString(url) })],
            }),
            External: ({ href }) => ({
              model,
              commands: [LoadExternal({ href })],
            }),
          }),

        ChangedUrl: (model, { url }) => {
          const nextRoute = urlToApplicationRoute(url)
          const transition = Transition.make(model.route, nextRoute)
          return handleTransitionStep(transition)(
            modifyFields(model, { route: () => nextRoute }),
          )
        },

        CompletedLoadCatalog: model => ({
          model: modifyFields(model, { catalogStatus: () => 'Ready' }),
        }),

        CompletedLoadPainting: (model, { paintingId }) =>
          model.paintingStatus._tag === 'Loading' &&
          model.paintingStatus.paintingId === paintingId
            ? {
                model: modifyFields(model, {
                  paintingStatus: () => PaintingStatus.Ready({ paintingId }),
                }),
              }
            : { model },

        UpdatedStudioDraft: (model, { value }) => ({
          model: modifyFields(model, { studioDraft: () => value }),
        }),

        CompletedSaveDraft: (model, { draft }) => ({
          model: modifyFields(model, {
            maybeSavedDraft: () => Option.some(draft),
          }),
        }),
      },

      commands: {
        NavigateInternal: ({ url: internalUrl }) =>
          pushUrl(internalUrl).pipe(
            Effect.as(Message.CompletedNavigateInternal()),
          ),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
        LoadCatalog: () =>
          Effect.sleep(CATALOG_LATENCY).pipe(
            Effect.as(Message.CompletedLoadCatalog()),
          ),
        LoadPainting: ({ paintingId }) =>
          Effect.sleep(PAINTING_LATENCY).pipe(
            Effect.as(Message.CompletedLoadPainting({ paintingId })),
          ),
        SaveDraft: ({ draft }) =>
          Effect.sleep(SAVE_LATENCY).pipe(
            Effect.as(Message.CompletedSaveDraft({ draft })),
          ),
      },

      view,
    }
  }),
)

// TRANSITION STEPS

const MAX_LOGGED_TRANSITIONS = 20

type AppTransition = Transition.Transition<ApplicationRoute>

type StepReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<ApplicationCommand>
}>

type Step = (model: Model) => StepReturn

const nextSequenceNumber = (
  transitionLog: ReadonlyArray<LoggedTransition>,
): number =>
  Option.match(Array.head(transitionLog), {
    onNone: () => 1,
    onSome: newestEntry => newestEntry.sequenceNumber + 1,
  })

const logTransitionStep =
  (transition: AppTransition): Step =>
  model => ({
    model: modifyFields(model, {
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
  })

const loadCatalogOnGalleryEntryStep =
  (transition: AppTransition): Step =>
  model =>
    Transition.isEntering(transition, 'Gallery') &&
    model.catalogStatus !== 'Loading'
      ? {
          model: modifyFields(model, { catalogStatus: () => 'Loading' }),
          commands: [LoadCatalog()],
        }
      : { model }

const keepModelStep: Step = model => ({ model })

const loadPaintingStep =
  (paintingId: number): Step =>
  model => ({
    model: modifyFields(model, {
      paintingStatus: () => PaintingStatus.Loading({ paintingId }),
    }),
    commands: [LoadPainting({ paintingId })],
  })

const reconcilePaintingRouteStep = (transition: AppTransition): Step =>
  Transition.matchOrElse<Step>()(
    transition,
    'Painting',
    {
      Entered: ({ paintingId }) => loadPaintingStep(paintingId),
      Stayed: ({ previousRoute, nextRoute }) =>
        previousRoute.paintingId === nextRoute.paintingId
          ? keepModelStep
          : loadPaintingStep(nextRoute.paintingId),
    },
    () => keepModelStep,
  )

const saveDraftOnStudioExitStep =
  (transition: AppTransition): Step =>
  model => ({
    model,
    commands: Array.filter(
      [SaveDraft({ draft: model.studioDraft })],
      () =>
        Transition.isExiting(transition, 'Studio') && model.studioDraft !== '',
    ),
  })

const sequenceSteps =
  (steps: ReadonlyArray<Step>): Step =>
  model => {
    const initial: StepReturn = { model }

    return Array.reduce(steps, initial, (previous, step) => {
      const next = step(previous.model)
      return {
        model: next.model,
        commands: [...(previous.commands ?? []), ...(next.commands ?? [])],
      }
    })
  }

const handleTransitionStep = (transition: AppTransition): Step =>
  sequenceSteps([
    logTransitionStep(transition),
    loadCatalogOnGalleryEntryStep(transition),
    reconcilePaintingRouteStep(transition),
    saveDraftOnStudioExitStep(transition),
  ])

// INIT

export const init = (url: Url) => {
  const route = urlToApplicationRoute(url)
  const initialModel = Model.make({
    route,
    transitionLog: [],
    catalogStatus: 'Idle',
    paintingStatus: PaintingStatus.Idle(),
    studioDraft: '',
    maybeSavedDraft: Option.none(),
  })
  return handleTransitionStep(Transition.coldLoad(route))(initialModel)
}

// VIEW

type ApplicationViewBuilder = HtmlBuilder<Message>

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

const view = (model: Model, h: ApplicationViewBuilder): Document => {
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
}

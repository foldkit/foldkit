import { Array, Duration, Effect, Match, Option, Schema, pipe } from 'effect'
import { Command, Runtime, Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { defineTaggedUnion } from 'foldkit/schema'
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

export { AppRoute } from './route'

const CATALOG_LATENCY = Duration.millis(600)
const PAINTING_LATENCY = Duration.millis(400)
const SAVE_LATENCY = Duration.millis(300)
const MAX_LOGGED_TRANSITIONS = 20

// MODEL

export const CatalogStatus = Schema.Literals(['Idle', 'Loading', 'Ready'])
export type CatalogStatus = typeof CatalogStatus.Type

export const PaintingStatus = defineTaggedUnion({
  Idle: {},
  Loading: { paintingId: Schema.Number },
  Ready: { paintingId: Schema.Number },
})
export type PaintingStatus = typeof PaintingStatus.Type

export const LoggedTransition = Schema.Struct({
  sequenceNumber: Schema.Number,
  maybePreviousRoute: Schema.Option(AppRoute),
  nextRoute: AppRoute,
})
export type LoggedTransition = typeof LoggedTransition.Type

export const Model = Schema.Struct({
  route: AppRoute,
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
  SucceededLoadCatalog: {},
  SucceededLoadPainting: { paintingId: Schema.Number },
  UpdatedStudioDraft: { value: Schema.String },
  SucceededSaveDraft: { draft: Schema.String },
})

export type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

export const LoadCatalog = Command.define('LoadCatalog', {
  messages: [Message.SucceededLoadCatalog],
  execute: Effect.sleep(CATALOG_LATENCY).pipe(
    Effect.as(Message.SucceededLoadCatalog()),
  ),
})

export const LoadPainting = Command.define('LoadPainting', {
  args: { paintingId: Schema.Number },
  messages: [Message.SucceededLoadPainting],
  execute: ({ paintingId }) =>
    Effect.sleep(PAINTING_LATENCY).pipe(
      Effect.as(Message.SucceededLoadPainting({ paintingId })),
    ),
})

export const SaveDraft = Command.define('SaveDraft', {
  args: { draft: Schema.String },
  messages: [Message.SucceededSaveDraft],
  execute: ({ draft }) =>
    Effect.sleep(SAVE_LATENCY).pipe(
      Effect.as(Message.SucceededSaveDraft({ draft })),
    ),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>
type Step = Update.Step<Model, Message>

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
  model => ({
    model: evo(model, {
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

const loadCatalogOnGalleryEntry =
  (transition: AppTransition): Step =>
  model =>
    Transition.isEntering(transition, 'Gallery') &&
    model.catalogStatus !== 'Loading'
      ? {
          model: evo(model, { catalogStatus: () => 'Loading' }),
          commands: [LoadCatalog()],
        }
      : { model }

const loadPaintingOnEntry =
  (transition: AppTransition): Step =>
  model =>
    Option.match(Transition.entered(transition, 'Painting'), {
      onNone: () => ({ model }),
      onSome: ({ paintingId }) => ({
        model: evo(model, {
          paintingStatus: () => PaintingStatus.Loading({ paintingId }),
        }),
        commands: [LoadPainting({ paintingId })],
      }),
    })

const reloadPaintingOnIdChange =
  (transition: AppTransition): Step =>
  model =>
    Option.match(Transition.stayed(transition, 'Painting'), {
      onNone: () => ({ model }),
      onSome: ({ previousRoute, nextRoute }) =>
        previousRoute.paintingId === nextRoute.paintingId
          ? { model }
          : {
              model: evo(model, {
                paintingStatus: () =>
                  PaintingStatus.Loading({
                    paintingId: nextRoute.paintingId,
                  }),
              }),
              commands: [LoadPainting({ paintingId: nextRoute.paintingId })],
            },
    })

const saveDraftOnStudioExit =
  (transition: AppTransition): Step =>
  model =>
    Option.match(Transition.exited(transition, 'Studio'), {
      onNone: () => ({ model }),
      onSome: () =>
        model.studioDraft === ''
          ? { model }
          : { model, commands: [SaveDraft({ draft: model.studioDraft })] },
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

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) => {
      const nextRoute = urlToAppRoute(url)
      const transition = Transition.make(model.route, nextRoute)
      return handleTransition(
        evo(model, { route: () => nextRoute }),
        transition,
      )
    },

    SucceededLoadCatalog: () => ({
      model: evo(model, { catalogStatus: () => 'Ready' }),
    }),

    SucceededLoadPainting: ({ paintingId }) =>
      model.paintingStatus._tag === 'Loading' &&
      model.paintingStatus.paintingId === paintingId
        ? {
            model: evo(model, {
              paintingStatus: () => PaintingStatus.Ready({ paintingId }),
            }),
          }
        : { model },

    UpdatedStudioDraft: ({ value }) => ({
      model: evo(model, { studioDraft: () => value }),
    }),

    SucceededSaveDraft: ({ draft }) => ({
      model: evo(model, { maybeSavedDraft: () => Option.some(draft) }),
    }),
  })

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = (
  url: Url,
) => {
  const route = urlToAppRoute(url)
  const initialModel = Model.make({
    route,
    transitionLog: [],
    catalogStatus: 'Idle',
    paintingStatus: PaintingStatus.Idle(),
    studioDraft: '',
    maybeSavedDraft: Option.none(),
  })
  return handleTransition(initialModel, Transition.coldLoad(route))
}

// VIEW

const routeLabel = (route: AppRoute): string =>
  AppRoute.match(route, {
    Home: () => 'Home',
    Gallery: () => 'Gallery',
    Painting: ({ paintingId }) => `Painting ${paintingId}`,
    Studio: () => 'Studio',
    NotFound: () => 'Not found',
  })

const navigationView = (
  currentRoute: AppRoute,
  h: HtmlBuilder<Message>,
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

const homeView = (h: HtmlBuilder<Message>): Html =>
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

const loadingView = (label: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Class(
        'border border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500',
      ),
    ],
    [label],
  )

const paintingGridView = (h: HtmlBuilder<Message>): Html =>
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
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(findPaintingWithIndex(paintingId), {
    onNone: () => missingPaintingView(paintingId, h),
    onSome: ({ painting, paintingIndex }) =>
      foundPaintingView(painting, paintingIndex, paintingStatus, h),
  })

const studioView = (
  studioDraft: string,
  maybeSavedDraft: Option.Option<string>,
  h: HtmlBuilder<Message>,
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

const notFoundView = (path: string, h: HtmlBuilder<Message>): Html =>
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
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
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

const routeTitle = (route: AppRoute): string =>
  Match.value(route).pipe(
    Match.tag('Home', () => 'Route Transitions'),
    Match.orElse(
      currentRoute => `${routeLabel(currentRoute)} | Route Transitions`,
    ),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const routeContent = AppRoute.match(model.route, {
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

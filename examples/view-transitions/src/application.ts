import { Array, Effect, Option, Schema, String, pipe } from 'effect'
import { Block, Command, Route, Runtime } from 'foldkit'
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
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

const Artwork = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  medium: Schema.String,
  description: Schema.String,
  gradientClassName: Schema.String,
})
type Artwork = typeof Artwork.Type

const artworks: ReadonlyArray<Artwork> = [
  {
    id: 1,
    title: 'Dawn Chorus',
    medium: 'Gradient on canvas',
    description:
      'A warm wash of first light. The rose bleeds into amber the way a sunrise refuses a hard edge.',
    gradientClassName: 'from-rose-400 to-amber-300',
  },
  {
    id: 2,
    title: 'Deep Water',
    medium: 'Gradient on linen',
    description:
      'Open ocean past the shelf, where the blue stops describing depth and starts describing weight.',
    gradientClassName: 'from-sky-500 to-indigo-700',
  },
  {
    id: 3,
    title: 'Moss Study',
    medium: 'Gradient on paper',
    description:
      'Forest floor after a week of rain. Every green in the study is borrowed from something alive.',
    gradientClassName: 'from-lime-400 to-emerald-600',
  },
  {
    id: 4,
    title: 'Violet Hour',
    medium: 'Gradient on canvas',
    description:
      'The ten minutes after sunset when streetlights and sky briefly agree on a color.',
    gradientClassName: 'from-purple-500 to-fuchsia-400',
  },
  {
    id: 5,
    title: 'Kiln',
    medium: 'Gradient on steel',
    description:
      'Heat rendered literally. Orange at the mouth of the furnace, red where the eye gives up.',
    gradientClassName: 'from-orange-500 to-red-600',
  },
  {
    id: 6,
    title: 'Glacier Milk',
    medium: 'Gradient on linen',
    description:
      'Meltwater carries rock flour that turns whole rivers this improbable, chalky turquoise.',
    gradientClassName: 'from-cyan-300 to-teal-500',
  },
  {
    id: 7,
    title: 'Graphite',
    medium: 'Gradient on paper',
    description:
      'A monochrome argument that gray is not one color. Pencil shading scaled up to a weather system.',
    gradientClassName: 'from-slate-400 to-zinc-700',
  },
  {
    id: 8,
    title: 'Pollen',
    medium: 'Gradient on canvas',
    description:
      'Late spring in a single field. The yellow is loud on purpose; so is the season.',
    gradientClassName: 'from-yellow-300 to-lime-500',
  },
]

const findArtwork = (artworkId: number): Option.Option<Artwork> =>
  Array.findFirst(artworks, artwork => artwork.id === artworkId)

export const ApplicationRoute = defineRouteUnion({
  Gallery: {},
  Artwork: { artworkId: Schema.Number },
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

const galleryRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Gallery))

const artworkRouter = pipe(
  literal('artwork'),
  slash(int('artworkId')),
  Route.mapTo(ApplicationRoute.Artwork),
)

const routeParser = Route.oneOf(artworkRouter, galleryRouter)

const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

export const Model = Schema.Struct({
  route: ApplicationRoute,
  filterText: Schema.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  UpdatedFilterText: { filterText: Schema.String },
})
export type Message = typeof Message.Type

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

export class Application extends Block<Application, Readonly<{ url: Url }>>()(
  'Application',
  {
    Model,
    Message,
    Command: [NavigateInternal, LoadExternal],
  },
) {}

type ApplicationViewBuilder = HtmlBuilder<Message>

// NOTE: every arm past the guard is a navigation, so none return `false`.
// `true` is "animate, with no direction to declare": the root fade in
// `styles.css` is not type-scoped, so an untyped transition still cross-fades,
// it just does not slide.
export const decideViewTransition = ({
  previousModel,
  model,
  message,
}: Runtime.ViewTransitionContext<
  Model,
  Message
>): Runtime.ViewTransitionDecision => {
  if (message._tag !== 'ChangedUrl') {
    return false
  }

  const transition = Transition.make(previousModel.route, model.route)

  return Option.match(Transition.enteredAny(transition), {
    onNone: () => true,
    onSome: ApplicationRoute.match<Runtime.ViewTransitionDecision>({
      Artwork: () => ({ types: ['to-artwork-detail'] }),
      Gallery: () => ({ types: ['to-gallery'] }),
      NotFound: () => true,
    }),
  })
}

const isApplication = Schema.is(Application)

// NOTE: the runtime hands the predicate the root Application instances, so the
// decision reads the Model each instance holds.
export const viewTransition: Runtime.ViewTransitionConfig<unknown, Message> = ({
  previousModel,
  model,
  message,
}) => {
  if (isApplication(previousModel) && isApplication(model)) {
    return decideViewTransition({
      previousModel: previousModel.model,
      model: model.model,
      message,
    })
  } else {
    return false
  }
}

const transitionNameFor = (artworkId: number): string => `artwork-${artworkId}`

// NOTE: names have to be unique per snapshot, so each artwork carries its own.
// The shared class is what lets `styles.css` reach all of them with one rule,
// since a per-artwork name cannot be written as a selector ahead of time.
const artworkTransitionStyle = (artworkId: number) => ({
  viewTransitionName: transitionNameFor(artworkId),
  viewTransitionClass: 'artwork',
})

const filteredArtworks = (filterText: string): ReadonlyArray<Artwork> => {
  const normalizedFilter = filterText.trim().toLowerCase()

  if (String.isEmpty(normalizedFilter)) {
    return artworks
  } else {
    return Array.filter(artworks, artwork =>
      String.includes(normalizedFilter)(
        `${artwork.title} ${artwork.medium}`.toLowerCase(),
      ),
    )
  }
}

const artworkCardView = (artwork: Artwork, h: ApplicationViewBuilder): Html =>
  h.keyed('a')(
    `artwork-${artwork.id}`,
    [h.Href(artworkRouter({ artworkId: artwork.id })), h.Class('group block')],
    [
      h.div([
        h.Class(
          `aspect-square rounded-xl bg-gradient-to-br shadow-sm transition-shadow group-hover:shadow-lg ${artwork.gradientClassName}`,
        ),
        h.Style(artworkTransitionStyle(artwork.id)),
      ]),
      h.p([h.Class('mt-3 font-medium text-gray-900')], [artwork.title]),
      h.p([h.Class('text-sm text-gray-500')], [artwork.medium]),
    ],
  )

const emptyGalleryView = (h: ApplicationViewBuilder): Html =>
  h.p([h.Class('text-gray-500')], ['No artworks match the filter.'])

const artworkGridView = (
  matchedArtworks: ReadonlyArray<Artwork>,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class('grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4')],
    Array.map(matchedArtworks, artwork => artworkCardView(artwork, h)),
  )

const galleryView = (filterText: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('mx-auto max-w-5xl px-6')],
    [
      h.input([
        h.Type('search'),
        h.Value(filterText),
        h.Placeholder('Filter by title or medium…'),
        h.OnInput(value => Message.UpdatedFilterText({ filterText: value })),
        h.Class(
          'mb-8 w-full max-w-md rounded-lg border border-gray-300 bg-white px-4 py-2 focus:ring-2 focus:ring-gray-400 focus:outline-none',
        ),
      ]),
      Array.match(filteredArtworks(filterText), {
        onEmpty: () => emptyGalleryView(h),
        onNonEmpty: matchedArtworks => artworkGridView(matchedArtworks, h),
      }),
    ],
  )

const missingArtworkView = (
  artworkId: number,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [],
    [
      h.h1(
        [h.Class('text-3xl font-bold text-gray-900')],
        ['Artwork not found'],
      ),
      h.p(
        [h.Class('mt-2 text-gray-600')],
        [`No artwork exists with ID ${artworkId}.`],
      ),
      h.a(
        [
          h.Href(galleryRouter()),
          h.Class('mt-4 inline-block text-gray-900 underline'),
        ],
        ['← Back to gallery'],
      ),
    ],
  )

// NOTE: the hero keeps the card's square ratio on purpose. A View Transition
// interpolates the old and new snapshots while it interpolates the box, so a
// square growing into a wider box visibly stretches mid-flight. Matching the
// ratio makes the morph a pure scale and translate, which is the one case the
// browser renders cleanly.
const foundArtworkView = (artwork: Artwork, h: ApplicationViewBuilder): Html =>
  h.div(
    [],
    [
      h.a(
        [
          h.Href(galleryRouter()),
          h.Class('text-gray-600 underline hover:text-gray-900'),
        ],
        ['← Back to gallery'],
      ),
      h.div(
        [
          h.Class(
            'mt-6 grid gap-10 md:grid-cols-[minmax(0,24rem)_1fr] md:items-center',
          ),
        ],
        [
          h.div([
            h.Class(
              `aspect-square w-full rounded-2xl bg-gradient-to-br shadow-md ${artwork.gradientClassName}`,
            ),
            h.Style(artworkTransitionStyle(artwork.id)),
          ]),
          h.div(
            [],
            [
              h.h1(
                [h.Class('text-3xl font-bold text-gray-900')],
                [artwork.title],
              ),
              h.p([h.Class('mt-1 text-sm text-gray-500')], [artwork.medium]),
              h.p(
                [h.Class('mt-4 text-lg leading-relaxed text-gray-700')],
                [artwork.description],
              ),
            ],
          ),
        ],
      ),
    ],
  )

const artworkDetailView = (
  artworkId: number,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class('mx-auto max-w-5xl px-6')],
    [
      Option.match(findArtwork(artworkId), {
        onNone: () => missingArtworkView(artworkId, h),
        onSome: artwork => foundArtworkView(artwork, h),
      }),
    ],
  )

const notFoundView = (path: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('mx-auto max-w-3xl px-6')],
    [
      h.h1([h.Class('text-3xl font-bold text-gray-900')], ['Page not found']),
      h.p(
        [h.Class('mt-2 text-gray-600')],
        [`The path "${path}" does not exist.`],
      ),
      h.a(
        [
          h.Href(galleryRouter()),
          h.Class('mt-4 inline-block text-gray-900 underline'),
        ],
        ['← Back to gallery'],
      ),
    ],
  )

const routeTitle = (route: ApplicationRoute): string =>
  ApplicationRoute.match(route, {
    Gallery: () => 'View Transitions',
    Artwork: ({ artworkId }) =>
      Option.match(findArtwork(artworkId), {
        onNone: () => 'Artwork Not Found | View Transitions',
        onSome: artwork => `${artwork.title} | View Transitions`,
      }),
    NotFound: () => 'Page Not Found | View Transitions',
  })

const view = (model: Model, h: ApplicationViewBuilder): Document => {
  const routeContent = ApplicationRoute.match(model.route, {
    Gallery: () => galleryView(model.filterText, h),
    Artwork: ({ artworkId }) => artworkDetailView(artworkId, h),
    NotFound: ({ path }) => notFoundView(path, h),
  })

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-gray-50 py-10')],
      [
        // NOTE: naming the header lifts it out of the root snapshot, so it
        // stays a live element the transition never touches. Without a name it
        // rides the page cross-fade and animates on every navigation despite
        // being identical on both routes, which reads as jank.
        h.header(
          [
            h.Class('mx-auto max-w-5xl px-6 pb-8'),
            h.Style({ viewTransitionName: 'page-header' }),
          ],
          [
            h.a(
              [
                h.Href(galleryRouter()),
                h.Class('text-2xl font-bold text-gray-900'),
              ],
              ['Gradient Gallery'],
            ),
            h.p(
              [h.Class('mt-1 text-gray-600')],
              [
                'Click an artwork and watch it grow into the detail page. Typing in the filter never animates.',
              ],
            ),
          ],
        ),
        h.main([], [routeContent]),
      ],
    ),
  }
}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    return {
      model: { route: urlToApplicationRoute(url), filterText: '' },

      update: {
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),

        ClickedLink: (model, { request }) =>
          UrlRequest.match(request, {
            Internal: ({ url: internalUrl }) => ({
              model,
              commands: [NavigateInternal({ url: urlToString(internalUrl) })],
            }),
            External: ({ href }) => ({
              model,
              commands: [LoadExternal({ href })],
            }),
          }),

        ChangedUrl: (model, { url: nextUrl }) => ({
          model: modifyFields(model, {
            route: () => urlToApplicationRoute(nextUrl),
          }),
        }),

        UpdatedFilterText: (model, { filterText }) => ({
          model: modifyFields(model, { filterText: () => filterText }),
        }),
      },

      commands: {
        NavigateInternal: ({ url: internalUrl }) =>
          pushUrl(internalUrl).pipe(
            Effect.as(Message.CompletedNavigateInternal()),
          ),
        LoadExternal: ({ href }) =>
          load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
      },

      view,
    }
  }),
)

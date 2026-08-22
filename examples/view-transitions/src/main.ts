import { Array, Effect, Match as M, Option, Schema as S, String } from 'effect'
import { Command, Runtime, type Update } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { Transition } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { Artwork, artworks, findArtwork } from './artwork'
import { AppRoute, artworkRouter, galleryRouter, urlToAppRoute } from './route'

export { ArtworkRoute, GalleryRoute, NotFoundRoute } from './route'

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  filterText: S.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  UpdatedFilterText: { filterText: S.String },
})

export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = (
  url: Url,
) => ({ model: { route: urlToAppRoute(url), filterText: '' } })

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: S.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    ClickedLink: ({ request }) =>
      M.value(request).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          Internal: ({ url }) => ({
            model,
            commands: [NavigateInternal({ url: urlToString(url) })],
          }),
          External: ({ href }) => ({
            model,
            commands: [LoadExternal({ href })],
          }),
        }),
      ),

    ChangedUrl: ({ url }) => ({
      model: evo(model, { route: () => urlToAppRoute(url) }),
    }),

    UpdatedFilterText: ({ filterText }) => ({
      model: evo(model, { filterText: () => filterText }),
    }),
  })

// NOTE: every arm past the guard is a navigation, so none return `false`.
// `true` is "animate, with no direction to declare": the root fade in
// `styles.css` is not type-scoped, so an untyped transition still cross-fades,
// it just does not slide.
export const viewTransition: Runtime.ViewTransitionConfig<Model, Message> = ({
  previousModel,
  model,
  message,
}) => {
  if (message._tag !== 'ChangedUrl') {
    return false
  }

  const transition = Transition.make(previousModel.route, model.route)

  return Option.match(Transition.enteredAny(transition), {
    onNone: () => true,
    onSome: M.type<AppRoute>().pipe(
      M.withReturnType<Runtime.ViewTransitionDecision>(),
      M.tagsExhaustive({
        Artwork: () => ({ types: ['to-artwork-detail'] }),
        Gallery: () => ({ types: ['to-gallery'] }),
        NotFound: () => true,
      }),
    ),
  })
}

// VIEW

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

const artworkCardView = (artwork: Artwork, h: HtmlBuilder<Message>): Html =>
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

const emptyGalleryView = (h: HtmlBuilder<Message>): Html =>
  h.p([h.Class('text-gray-500')], ['No artworks match the filter.'])

const artworkGridView = (
  matchedArtworks: ReadonlyArray<Artwork>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4')],
    Array.map(matchedArtworks, artwork => artworkCardView(artwork, h)),
  )

const galleryView = (filterText: string, h: HtmlBuilder<Message>): Html =>
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

const missingArtworkView = (artworkId: number, h: HtmlBuilder<Message>): Html =>
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
const foundArtworkView = (artwork: Artwork, h: HtmlBuilder<Message>): Html =>
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

const artworkDetailView = (artworkId: number, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('mx-auto max-w-5xl px-6')],
    [
      Option.match(findArtwork(artworkId), {
        onNone: () => missingArtworkView(artworkId, h),
        onSome: artwork => foundArtworkView(artwork, h),
      }),
    ],
  )

const notFoundView = (path: string, h: HtmlBuilder<Message>): Html =>
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

const routeTitle = (route: AppRoute): string =>
  M.value(route).pipe(
    M.tagsExhaustive({
      Gallery: () => 'View Transitions',
      Artwork: ({ artworkId }) =>
        Option.match(findArtwork(artworkId), {
          onNone: () => 'Artwork Not Found | View Transitions',
          onSome: artwork => `${artwork.title} | View Transitions`,
        }),
      NotFound: () => 'Page Not Found | View Transitions',
    }),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Gallery: () => galleryView(model.filterText, h),
      Artwork: ({ artworkId }) => artworkDetailView(artworkId, h),
      NotFound: ({ path }) => notFoundView(path, h),
    }),
  )

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

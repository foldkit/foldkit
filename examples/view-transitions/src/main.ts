import { Array, Effect, Match as M, Option, Schema as S, String } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
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

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const ClickedLink = m('ClickedLink', { request: UrlRequest })
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const UpdatedFilterText = m('UpdatedFilterText', {
  filterText: S.String,
})

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  UpdatedFilterText,
])
export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = (
  url: Url,
) => [{ route: urlToAppRoute(url), filterText: '' }, []]

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

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

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

      ChangedUrl: ({ url }) => [
        evo(model, { route: () => urlToAppRoute(url) }),
        [],
      ],

      UpdatedFilterText: ({ filterText }) => [
        evo(model, { filterText: () => filterText }),
        [],
      ],
    }),
  )

/** Route changes ride a View Transition; everything else (typing in the
 *  filter input) renders plainly. The Model already holds the destination
 *  route when the predicate runs, so the transition type encodes direction:
 *  zooming into a detail page slides one way, returning to the gallery
 *  slides back. `styles.css` scopes the two animations with
 *  `:active-view-transition-type(...)`. */
export const viewTransition: Runtime.ViewTransitionConfig<Model, Message> = ({
  model,
  message,
}) => {
  if (message._tag !== 'ChangedUrl') {
    return false
  }

  const direction = model.route._tag === 'Artwork' ? 'to-detail' : 'to-gallery'
  return { types: [direction] }
}

// VIEW

const transitionNameFor = (artworkId: number): string => `artwork-${artworkId}`

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

const artworkCardView = (artwork: Artwork): Html => {
  const h = html<Message>()

  return h.keyed('a')(
    `artwork-${artwork.id}`,
    [h.Href(artworkRouter({ artworkId: artwork.id })), h.Class('group block')],
    [
      h.div(
        [
          h.Class(
            `aspect-square rounded-xl bg-gradient-to-br shadow-sm transition-shadow group-hover:shadow-lg ${artwork.gradientClassName}`,
          ),
          h.Style({ viewTransitionName: transitionNameFor(artwork.id) }),
        ],
        [],
      ),
      h.p([h.Class('mt-3 font-medium text-gray-900')], [artwork.title]),
      h.p([h.Class('text-sm text-gray-500')], [artwork.medium]),
    ],
  )
}

const galleryView = (filterText: string): Html => {
  const h = html<Message>()

  const visibleArtworks = filteredArtworks(filterText)

  return h.div(
    [h.Class('mx-auto max-w-5xl px-6')],
    [
      h.input([
        h.Type('search'),
        h.Value(filterText),
        h.Placeholder('Filter by title or medium…'),
        h.OnInput(filterText => UpdatedFilterText({ filterText })),
        h.Class(
          'mb-8 w-full max-w-md rounded-lg border border-gray-300 bg-white px-4 py-2 focus:ring-2 focus:ring-gray-400 focus:outline-none',
        ),
      ]),
      Array.match(visibleArtworks, {
        onEmpty: () =>
          h.keyed('p')(
            'Empty',
            [h.Class('text-gray-500')],
            ['No artworks match the filter.'],
          ),
        onNonEmpty: matchedArtworks =>
          h.keyed('div')(
            'Grid',
            [h.Class('grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4')],
            Array.map(matchedArtworks, artworkCardView),
          ),
      }),
    ],
  )
}

const missingArtworkView = (artworkId: number): Html => {
  const h = html<Message>()

  return h.div(
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
}

const artworkDetailView = (artworkId: number): Html => {
  const h = html<Message>()

  const maybeArtwork = findArtwork(artworkId)

  const contentKey = Option.match(maybeArtwork, {
    onNone: () => 'Missing',
    onSome: () => 'Found',
  })

  const content = Option.match(maybeArtwork, {
    onNone: () => missingArtworkView(artworkId),
    onSome: artwork =>
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
                `mt-6 aspect-video w-full rounded-2xl bg-gradient-to-br shadow-md ${artwork.gradientClassName}`,
              ),
              h.Style({ viewTransitionName: transitionNameFor(artwork.id) }),
            ],
            [],
          ),
          h.h1(
            [h.Class('mt-6 text-3xl font-bold text-gray-900')],
            [artwork.title],
          ),
          h.p([h.Class('mt-1 text-sm text-gray-500')], [artwork.medium]),
          h.p(
            [h.Class('mt-4 max-w-prose text-gray-700')],
            [artwork.description],
          ),
        ],
      ),
  })

  return h.div(
    [h.Class('mx-auto max-w-3xl px-6')],
    [h.keyed('div')(contentKey, [], [content])],
  )
}

const notFoundView = (path: string): Html => {
  const h = html<Message>()

  return h.div(
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
}

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

export const view = (model: Model): Document => {
  const h = html<Message>()

  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Gallery: () => galleryView(model.filterText),
      Artwork: ({ artworkId }) => artworkDetailView(artworkId),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-gray-50 py-10')],
      [
        h.header(
          [h.Class('mx-auto max-w-5xl px-6 pb-8')],
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
                'Click an artwork and watch it morph into the detail page. Typing in the filter never animates.',
              ],
            ),
          ],
        ),
        h.main([], [h.keyed('div')(model.route._tag, [], [routeContent])]),
      ],
    ),
  }
}

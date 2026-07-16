import { clsx } from 'clsx'
import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import * as Markdown from '@foldkit/markdown'

import { Post, about, findPost, posts } from './content'
import { Counter, islandAttributes } from './island'
import { proseView } from './prose'
import * as Route from './route'

export { HomeRoute, NotFoundRoute, PostRoute, PostsRoute } from './route'

// MODEL

export const Model = S.Struct({
  route: Route.AppRoute,
  counter: Counter.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const ClickedLink = m('ClickedLink', { request: UrlRequest })
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const GotCounterMessage = m('GotCounterMessage', {
  message: Counter.Message,
})

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  GotCounterMessage,
])
export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingApplicationInit<Model, Message> = (
  url: Url,
) => [{ route: Route.urlToAppRoute(url), counter: Counter.init }, []]

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
    M.tags({
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
        const nextRoute = Route.urlToAppRoute(url)
        return [evo(model, { route: () => nextRoute }), []]
      },

      GotCounterMessage: ({ message }) => {
        const [nextCounter, counterCommands] = Counter.update(
          model.counter,
          message,
        )
        return [
          evo(model, { counter: () => nextCounter }),
          Command.mapMessages(counterCommands, childMessage =>
            GotCounterMessage({ message: childMessage }),
          ),
        ]
      },
    }),
    M.tag('CompletedNavigateInternal', 'CompletedLoadExternal', () => [
      model,
      [],
    ]),
    M.exhaustive,
  )

// VIEW

const islandViews = (model: Model): Markdown.Islands => {
  const h = html<Message>()

  return Markdown.islandsFor(islandAttributes, {
    Counter: ({ label }, _content, occurrenceIndex) =>
      h.div(
        [
          h.Class(
            'my-2 flex flex-col items-center gap-3 rounded-xl border border-stone-200 py-6',
          ),
        ],
        [
          h.span([h.Class('text-sm text-stone-500')], [label ?? 'Counter']),
          h.submodel({
            slotId: `counter-${occurrenceIndex}`,
            model: model.counter,
            view: Counter.view,
            toParentMessage: message => GotCounterMessage({ message }),
          }),
        ],
      ),

    Note: (_attributes, content) =>
      h.aside(
        [
          h.Class(
            'space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4',
          ),
        ],
        content,
      ),
  })
}

const navLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  clsx('text-sm transition hover:text-stone-900', {
    'font-semibold text-stone-900': isActive,
    'text-stone-500': !isActive,
  })

const headerView = (currentRoute: Route.AppRoute): Html => {
  const h = html<Message>()

  return h.header(
    [h.Class('border-b border-stone-200')],
    [
      h.div(
        [
          h.Class(
            'mx-auto flex max-w-2xl items-baseline justify-between px-6 py-6',
          ),
        ],
        [
          h.a(
            [
              h.Href(Route.homeRouter()),
              h.Class('font-semibold text-stone-900'),
            ],
            ['Devin Jameson'],
          ),
          h.nav(
            [],
            [
              h.ul(
                [h.Class('flex list-none gap-6')],
                [
                  h.li(
                    [],
                    [
                      h.a(
                        [
                          h.Href(Route.homeRouter()),
                          h.Class(
                            navLinkClassName({
                              isActive: currentRoute._tag === 'Home',
                            }),
                          ),
                        ],
                        ['About'],
                      ),
                    ],
                  ),
                  h.li(
                    [],
                    [
                      h.a(
                        [
                          h.Href(Route.postsRouter()),
                          h.Class(
                            navLinkClassName({
                              isActive: Route.isPostOrPosts(currentRoute),
                            }),
                          ),
                        ],
                        ['Posts'],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const homeView = (model: Model): Html => proseView(about, islandViews(model))

const postCardView = (post: Post): Html => {
  const h = html<Message>()

  return h.keyed('li')(
    post.slug,
    [],
    [
      h.a(
        [h.Href(Route.postRouter({ slug: post.slug })), h.Class('group block')],
        [
          h.h2(
            [
              h.Class(
                'text-xl font-semibold text-stone-900 group-hover:underline',
              ),
            ],
            [post.title],
          ),
          h.p([h.Class('mt-1 text-sm text-stone-500')], [post.publishedOn]),
          h.p([h.Class('mt-2 leading-relaxed text-stone-700')], [post.summary]),
        ],
      ),
    ],
  )
}

const postsView = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.h1([h.Class('mb-8 text-3xl font-bold text-stone-900')], ['Posts']),
      h.ul([h.Class('list-none space-y-8')], posts.map(postCardView)),
    ],
  )
}

const missingPostView = (slug: string): Html => {
  const h = html()

  return h.div(
    [],
    [
      h.h1([h.Class('text-3xl font-bold text-stone-900')], ['Post Not Found']),
      h.p(
        [h.Class('mt-4 leading-relaxed text-stone-700')],
        [`There is no post named "${slug}".`],
      ),
    ],
  )
}

const postView = (slug: string, model: Model): Html => {
  const h = html()

  const maybePost = findPost(slug)

  const contentKey = Option.match(maybePost, {
    onNone: () => 'Missing',
    onSome: post => `Post-${post.slug}`,
  })

  const content = Option.match(maybePost, {
    onNone: () => missingPostView(slug),
    onSome: post =>
      h.article(
        [],
        [
          h.h1([h.Class('text-3xl font-bold text-stone-900')], [post.title]),
          h.p(
            [h.Class('mt-2 mb-8 text-sm text-stone-500')],
            [post.publishedOn],
          ),
          proseView(post.document, islandViews(model)),
        ],
      ),
  })

  return h.div(
    [],
    [
      h.a(
        [
          h.Href(Route.postsRouter()),
          h.Class(
            'mb-8 inline-block text-sm text-stone-500 hover:text-stone-900',
          ),
        ],
        ['← All posts'],
      ),
      h.keyed('div')(contentKey, [], [content]),
    ],
  )
}

const notFoundView = (path: string): Html => {
  const h = html()

  return h.div(
    [],
    [
      h.h1([h.Class('text-3xl font-bold text-stone-900')], ['404']),
      h.p(
        [h.Class('mt-4 leading-relaxed text-stone-700')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [
          h.Href(Route.homeRouter()),
          h.Class(
            'mt-4 inline-block text-sm text-stone-500 hover:text-stone-900',
          ),
        ],
        ['← Go home'],
      ),
    ],
  )
}

const routeTitle = (route: Route.AppRoute): string =>
  M.value(route).pipe(
    M.tagsExhaustive({
      Home: () => 'Devin Jameson',
      Posts: () => 'Posts | Devin Jameson',
      Post: ({ slug }) =>
        Option.match(findPost(slug), {
          onNone: () => 'Post Not Found | Devin Jameson',
          onSome: post => `${post.title} | Devin Jameson`,
        }),
      NotFound: () => 'Not Found | Devin Jameson',
    }),
  )

export const view = (model: Model): Document => {
  const h = html<Message>()

  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(model),
      Posts: postsView,
      Post: ({ slug }) => postView(slug, model),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-white text-stone-800')],
      [
        headerView(model.route),
        h.main(
          [h.Class('mx-auto max-w-2xl px-6 py-10')],
          [h.keyed('div')(model.route._tag, [], [routeContent])],
        ),
      ],
    ),
  }
}

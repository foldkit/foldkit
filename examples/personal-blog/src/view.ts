import { clsx } from 'clsx'
import { Option } from 'effect'
import { Html } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
  CounterBinding,
} from './composition'
import { Post, about, findPost, posts } from './content'
import { islandAttributes } from './island'
import type { Model } from './model'
import { proseView } from './prose'
import * as Route from './route'

const islandViews = (
  model: Model,
  h: ApplicationViewBuilder,
): Markdown.Islands =>
  Markdown.islandsFor(islandAttributes, {
    Counter: ({ label }, _content, occurrenceIndex) =>
      h.div(
        [
          h.Class(
            'my-2 flex flex-col items-center gap-3 rounded-xl border border-stone-200 py-6',
          ),
        ],
        [
          h.span([h.Class('text-sm text-stone-500')], [label ?? 'Counter']),
          h.block(
            CounterBinding.embedView({
              slotId: `counter-${occurrenceIndex}`,
              model: model.counter,
            }),
          ),
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

const navLinkClassName = ({ isActive }: { isActive: boolean }): string =>
  clsx('text-sm transition hover:text-stone-900', {
    'font-semibold text-stone-900': isActive,
    'text-stone-500': !isActive,
  })

const headerView = (
  currentRoute: Route.ApplicationRoute,
  h: ApplicationViewBuilder,
): Html =>
  h.header(
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

const homeView = (model: Model, h: ApplicationViewBuilder): Html =>
  proseView(about, islandViews(model, h))

const postCardView = (post: Post, h: ApplicationViewBuilder): Html =>
  h.keyed('li')(
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

const postsView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [],
    [
      h.h1([h.Class('mb-8 text-3xl font-bold text-stone-900')], ['Posts']),
      h.ul(
        [h.Class('list-none space-y-8')],
        posts.map(post => postCardView(post, h)),
      ),
    ],
  )

const missingPostView = (slug: string, h: ApplicationViewBuilder): Html =>
  h.div(
    [],
    [
      h.h1([h.Class('text-3xl font-bold text-stone-900')], ['Post Not Found']),
      h.p(
        [h.Class('mt-4 leading-relaxed text-stone-700')],
        [`There is no post named "${slug}".`],
      ),
    ],
  )

const postView = (
  slug: string,
  model: Model,
  h: ApplicationViewBuilder,
): Html => {
  const maybePost = findPost(slug)

  const contentKey = Option.match(maybePost, {
    onNone: () => 'Missing',
    onSome: post => `Post-${post.slug}`,
  })

  const content = Option.match(maybePost, {
    onNone: () => missingPostView(slug, h),
    onSome: post =>
      h.article(
        [],
        [
          h.h1([h.Class('text-3xl font-bold text-stone-900')], [post.title]),
          h.p(
            [h.Class('mt-2 mb-8 text-sm text-stone-500')],
            [post.publishedOn],
          ),
          proseView(post.document, islandViews(model, h)),
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

const notFoundView = (path: string, h: ApplicationViewBuilder): Html =>
  h.div(
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

const routeTitle = (route: Route.ApplicationRoute): string =>
  Route.ApplicationRoute.match(route, {
    Home: () => 'Devin Jameson',
    Posts: () => 'Posts | Devin Jameson',
    Post: ({ slug }) =>
      Option.match(findPost(slug), {
        onNone: () => 'Post Not Found | Devin Jameson',
        onSome: post => `${post.title} | Devin Jameson`,
      }),
    NotFound: () => 'Not Found | Devin Jameson',
  })

export const view = ApplicationComposition.makeView((model, h) => {
  const routeContent = Route.ApplicationRoute.match(model.route, {
    Home: () => homeView(model, h),
    Posts: () => postsView(h),
    Post: ({ slug }) => postView(slug, model, h),
    NotFound: ({ path }) => notFoundView(path, h),
  })

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-white text-stone-800')],
      [
        headerView(model.route, h),
        h.main(
          [h.Class('mx-auto max-w-2xl px-6 py-10')],
          [h.keyed('div')(model.route._tag, [], [routeContent])],
        ),
      ],
    ),
  }
})

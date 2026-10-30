import { clsx } from 'clsx'
import { Array, Effect, Match, Option, Schema, pipe } from 'effect'
import { Block, Command, Route } from 'foldkit'
import {
  type Document,
  Html,
  type HtmlBuilder,
  inertHtml as ih,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'
import { modifyFields } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import * as Markdown from '@foldkit/markdown'

import aboutRaw from './content/about.md'
import makingThisBlogRaw from './content/making-this-blog.md'
import shootingFilmRaw from './content/shooting-film.md'
import { Counter } from './counter'
import { islandAttributes } from './domain/islandAttributes'

// ROUTE

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  Posts: {},
  Post: { slug: Schema.String },
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))

const postsRouter = pipe(literal('posts'), Route.mapTo(ApplicationRoute.Posts))

const postRouter = pipe(
  literal('posts'),
  slash(string('slug')),
  Route.mapTo(ApplicationRoute.Post),
)

const routeParser = Route.oneOf(postRouter, postsRouter, homeRouter)

const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

const isPostOrPosts = ApplicationRoute.isAnyOf(['Posts', 'Post'])

export const Model = Schema.Struct({
  route: ApplicationRoute,
  counter: Counter,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
})
export type Message = typeof Message.Type

export const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

export const LoadExternal = Command.define('LoadExternal', {
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

// CONTENT

const about: Markdown.MarkdownDocument = Markdown.decodeDocument(aboutRaw)

const Post = Schema.Struct({
  slug: Schema.String,
  title: Schema.String,
  publishedOn: Schema.String,
  summary: Schema.String,
  document: Markdown.MarkdownDocument,
})
type Post = typeof Post.Type

const posts: ReadonlyArray<Post> = [
  {
    slug: 'making-this-blog',
    title: 'Making This Blog',
    publishedOn: 'July 12, 2026',
    summary:
      'Markdown compiled into typed Foldkit views, with a live counter nestled between paragraphs.',
    document: Markdown.decodeDocument(makingThisBlogRaw),
  },
  {
    slug: 'shooting-film',
    title: 'Shooting Film',
    publishedOn: 'June 28, 2026',
    summary: 'Thirty-six chances per roll, and why film is pleasing.',
    document: Markdown.decodeDocument(shootingFilmRaw),
  },
]

const findPost = (slug: string): Option.Option<Post> =>
  Array.findFirst(posts, post => post.slug === slug)

// PROSE

const headingView = (
  heading: Markdown.Heading,
  content: Markdown.InlineContent,
): Html =>
  Match.value(heading.level).pipe(
    Match.when(1, () =>
      ih.h1([ih.Class('text-3xl font-bold text-stone-900')], content),
    ),
    Match.when(2, () =>
      ih.h2([ih.Class('mt-10 text-2xl font-semibold text-stone-900')], content),
    ),
    Match.when(3, () =>
      ih.h3([ih.Class('mt-8 text-xl font-semibold text-stone-900')], content),
    ),
    Match.when(4, () =>
      ih.h4([ih.Class('mt-6 text-lg font-semibold text-stone-900')], content),
    ),
    Match.when(5, () =>
      ih.h5([ih.Class('mt-6 font-semibold text-stone-900')], content),
    ),
    Match.when(6, () =>
      ih.h6([ih.Class('mt-6 text-sm font-semibold text-stone-900')], content),
    ),
    Match.exhaustive,
  )

const codeBlockView = (codeBlock: Markdown.CodeBlock): Html =>
  ih.div(
    [ih.Class('overflow-hidden rounded-lg bg-stone-900')],
    [
      ...Option.match(codeBlock.maybeLanguage, {
        onNone: () => [],
        onSome: language => [
          ih.keyed('div')(
            'Language',
            [
              ih.Class(
                'border-b border-stone-700 px-4 py-1.5 font-mono text-xs text-stone-400',
              ),
            ],
            [language],
          ),
        ],
      }),
      ih.pre(
        [ih.Class('overflow-x-auto p-4')],
        [
          ih.code(
            [ih.Class('font-mono text-sm text-stone-100')],
            [codeBlock.value],
          ),
        ],
      ),
    ],
  )

const listView = (list: Markdown.List, items: ReadonlyArray<Html>): Html => {
  const startAttributes = Option.match(list.maybeStartNumber, {
    onNone: () => [],
    onSome: startNumber => [ih.Start(startNumber)],
  })

  if (list.isOrdered) {
    return ih.ol(
      [...startAttributes, ih.Class('list-decimal space-y-1 pl-6')],
      items,
    )
  } else {
    return ih.ul([ih.Class('list-disc space-y-1 pl-6')], items)
  }
}

const alignmentClass = (alignment: Markdown.Alignment): string =>
  Match.value(alignment).pipe(
    Match.when('Right', () => 'text-right'),
    Match.when('Center', () => 'text-center'),
    Match.orElse(() => 'text-left'),
  )

const tableCellView = (
  _tableCell: Markdown.TableCell,
  content: Markdown.InlineContent,
  alignment: Markdown.Alignment,
  isHeader: boolean,
): Html => {
  const cellClass = `px-3 py-2 ${alignmentClass(alignment)}`

  if (isHeader) {
    return ih.th(
      [ih.Class(`${cellClass} font-semibold text-stone-900`)],
      content,
    )
  } else {
    return ih.td([ih.Class(`${cellClass} text-stone-700`)], content)
  }
}

const blogViews: Markdown.Views = {
  ...Markdown.defaultViews,

  Heading: headingView,

  Paragraph: (_paragraph, content) =>
    ih.p([ih.Class('leading-relaxed text-stone-700')], content),

  Link: (link, content) =>
    ih.a(
      [
        ih.Href(link.url),
        ih.Class(
          'text-stone-900 underline decoration-stone-300 underline-offset-2 hover:decoration-stone-900',
        ),
      ],
      content,
    ),

  InlineCode: inlineCode =>
    ih.code(
      [ih.Class('rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[0.9em]')],
      [inlineCode.value],
    ),

  CodeBlock: codeBlockView,

  List: listView,

  ListItem: (_listItem, blocks) =>
    ih.li([ih.Class('leading-relaxed text-stone-700')], blocks),

  Blockquote: (_blockquote, blocks) =>
    ih.blockquote(
      [ih.Class('space-y-4 border-l-4 border-stone-200 pl-4 text-stone-600')],
      blocks,
    ),

  ThematicBreak: () => ih.hr([ih.Class('my-8 border-stone-200')]),

  Table: (_table, headerRow, bodyRows) =>
    ih.div(
      [ih.Class('overflow-x-auto')],
      [
        ih.table(
          [ih.Class('w-full border-collapse text-sm')],
          [ih.thead([], [headerRow]), ih.tbody([], bodyRows)],
        ),
      ],
    ),

  TableRow: (_tableRow, cells) =>
    ih.tr([ih.Class('border-b border-stone-200')], cells),

  TableCell: tableCellView,
}

const proseView = (
  document: Markdown.MarkdownDocument,
  islands: Markdown.Islands,
): Html =>
  ih.div(
    [ih.Class('space-y-5')],
    Markdown.viewBlocks(document, { islands, views: blogViews }),
  )

// VIEW

type ApplicationViewBuilder = HtmlBuilder<Message>

const islandViews = (
  model: Model,
  h: ApplicationViewBuilder,
): Markdown.Islands =>
  Markdown.islandsFor(islandAttributes, {
    Counter: ({ label }) =>
      h.div(
        [
          h.Class(
            'my-2 flex flex-col items-center gap-3 rounded-xl border border-stone-200 py-6',
          ),
        ],
        [
          h.span([h.Class('text-sm text-stone-500')], [label ?? 'Counter']),
          model.counter.view(),
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
  currentRoute: ApplicationRoute,
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
            [h.Href(homeRouter()), h.Class('font-semibold text-stone-900')],
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
                          h.Href(homeRouter()),
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
                          h.Href(postsRouter()),
                          h.Class(
                            navLinkClassName({
                              isActive: isPostOrPosts(currentRoute),
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
        [h.Href(postRouter({ slug: post.slug })), h.Class('group block')],
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
          h.Href(postsRouter()),
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
          h.Href(homeRouter()),
          h.Class(
            'mt-4 inline-block text-sm text-stone-500 hover:text-stone-900',
          ),
        ],
        ['← Go home'],
      ),
    ],
  )

const routeTitle = (route: ApplicationRoute): string =>
  ApplicationRoute.match(route, {
    Home: () => 'Devin Jameson',
    Posts: () => 'Posts | Devin Jameson',
    Post: ({ slug }) =>
      Option.match(findPost(slug), {
        onNone: () => 'Post Not Found | Devin Jameson',
        onSome: post => `${post.title} | Devin Jameson`,
      }),
    NotFound: () => 'Not Found | Devin Jameson',
  })

const view = (model: Model, h: ApplicationViewBuilder): Document => {
  const routeContent = ApplicationRoute.match(model.route, {
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
}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { url }) {
    const counter = yield* new Counter('counter')

    return {
      model: { route: urlToApplicationRoute(url), counter },

      update: {
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
        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),
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

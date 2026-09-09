import { Match, Option } from 'effect'
import {
  Html,
  type HtmlBuilder,
  createKeyedLazy,
  inertHtml as ih,
} from 'foldkit/html'

import { Shared } from '../component'
import { Docs } from '../layout'
import { Message } from '../message'
import { type Model } from '../model'
import { Blog, NotFound } from '../page'
import * as Prose from '../prose'
import { type BlogPostRoute, type BlogRoute, homeRouter } from '../route'
import * as SnippetCopy from '../snippetCopy'
import * as Search from './search'
import * as Sidebar from './sidebar'

const PagefindBody = ih.DataAttribute('pagefind-body', '')
const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')

const postView = (
  post: Blog.BlogPost,
  snippetCopy: SnippetCopy.Model,
  h: HtmlBuilder<Message>,
): Html =>
  Blog.BlogPostPage.view(
    post,
    SnippetCopy.renderer(
      snippetCopy,
      message => Message.GotSnippetCopyMessage({ message }),
      h,
    ),
    Prose.renderHeadingLink(hash => Message.ClickedCopyLink({ hash }), h),
  )

const lazyPostView = createKeyedLazy()

// VIEW

export const view = (
  model: Model,
  blogRoute: BlogRoute | BlogPostRoute,
  h: HtmlBuilder<Message>,
): Html => {
  const content = Match.value(blogRoute).pipe(
    Match.withReturnType<Html>(),
    Match.tagsExhaustive({
      Blog: () => Blog.BlogIndex.view(),
      BlogPost: ({ postSlug }) =>
        Option.match(Blog.findPostBySlug(postSlug), {
          onNone: () => NotFound.view(postSlug, homeRouter()),
          onSome: post =>
            lazyPostView(post.slug, postView, [post, model.snippetCopy, h]),
        }),
    }),
  )

  const contentKey = Match.value(blogRoute).pipe(
    Match.tag('BlogPost', ({ postSlug }) => `BlogPost-${postSlug}`),
    Match.orElse(({ _tag }) => _tag),
  )

  return h.div(
    [h.Class('flex flex-col min-h-screen')],
    [
      Shared.skipNavLink,
      Docs.headerView(model, h),
      Search.dialogView(model, h),
      Sidebar.mobileView(model, h),
      h.main(
        [
          h.Id('main-content'),
          h.Class(
            'flex-1 flex flex-col pt-[var(--header-height)] bg-cream dark:bg-gray-900',
          ),
        ],
        [
          h.keyed('div')(
            contentKey,
            [
              PagefindBody,
              h.DataAttribute(
                'pagefind-weight',
                Docs.searchWeight(blogRoute._tag),
              ),
              h.Class('docs-content flex-1'),
            ],
            [content],
          ),
          h.div([PagefindIgnore], [Docs.footerView(model.currentYear, h)]),
        ],
      ),
    ],
  )
}

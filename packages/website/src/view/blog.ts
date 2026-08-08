import { Match as M, Option } from 'effect'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { type Model } from '../main'
import { type Message } from '../message'
import * as Page from '../page'
import { type BlogPostRoute, type BlogRoute, homeRouter } from '../route'
import { docsFooterView, docsHeaderView, searchSubmodelView } from './docs'
import { skipNavLink } from './shared'
import { mobileMenuView } from './sidebar'

const PagefindBody = ih.DataAttribute('pagefind-body', '')
const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')

const BLOG_SEARCH_WEIGHT = '4'

// VIEW

export const blogView = (
  model: Model,
  blogRoute: BlogRoute | BlogPostRoute,
  h: HtmlBuilder<Message>,
): Html => {
  const content = M.value(blogRoute).pipe(
    M.withReturnType<Html>(),
    M.tagsExhaustive({
      Blog: () => Page.Blog.BlogIndex.view(),
      BlogPost: ({ postSlug }) =>
        Option.match(Page.Blog.findPostBySlug(postSlug), {
          onNone: () => Page.NotFound.view(postSlug, homeRouter()),
          onSome: post =>
            Page.Blog.BlogPostPage.view(post, model.copiedSnippets, h),
        }),
    }),
  )

  const contentKey = M.value(blogRoute).pipe(
    M.tag('BlogPost', ({ postSlug }) => `BlogPost-${postSlug}`),
    M.orElse(({ _tag }) => _tag),
  )

  return h.div(
    [h.Class('flex flex-col min-h-screen')],
    [
      skipNavLink,
      docsHeaderView(model, h),
      searchSubmodelView(model, h),
      mobileMenuView(model, h),
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
              h.DataAttribute('pagefind-weight', BLOG_SEARCH_WEIGHT),
              h.Class(
                'flex-1 w-full px-4 py-6 md:px-6 2xl:py-10 max-w-3xl mx-auto min-w-0',
              ),
            ],
            [content],
          ),
          h.div(
            [PagefindIgnore],
            [
              docsFooterView(
                model.emailField,
                model.emailSubscriptionStatus,
                model.currentYear,
                h,
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

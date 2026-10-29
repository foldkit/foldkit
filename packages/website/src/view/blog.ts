import { Match, Option } from 'effect'
import { Html, createKeyedLazy, inertHtml as ih } from 'foldkit/html'

import { Shared } from '../component'
import type { ApplicationViewBuilder } from '../composition'
import {
  SnippetCopyBinding,
  SnippetDisclosureBinding,
  UiPagesBinding,
} from '../composition'
import { Docs } from '../layout'
import { docPage } from '../markdown'
import { Message } from '../message'
import { type Model } from '../model'
import { Blog, NotFound, UiBlock } from '../page'
import * as Release0167 from '../page/blog/post/foldkit-0-167-0'
import * as Prose from '../prose'
import { type ApplicationRoute, homeRouter } from '../route'
import { SnippetCopyBlock } from '../snippetCopy'
import * as SnippetCopyRenderer from '../snippetCopyRenderer'
import { SnippetDisclosureBlock } from '../snippetDisclosure'
import * as SnippetDisclosureRenderer from '../snippetDisclosureRenderer'
import * as Search from './search'
import * as Sidebar from './sidebar'

type BlogRoute = typeof ApplicationRoute.Blog.Type
type BlogPostRoute = typeof ApplicationRoute.BlogPost.Type

type SnippetCopyBlockModel = typeof SnippetCopyBlock.Model.Type
type SnippetDisclosureBlockModel = typeof SnippetDisclosureBlock.Model.Type
type UiBlockModel = typeof UiBlock.Model.Type
type Blog = BlogRoute
type BlogPost = BlogPostRoute

const PagefindBody = ih.DataAttribute('pagefind-body', '')
const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')

const postView = (
  post: Blog.BlogPost,
  snippetCopy: SnippetCopyBlockModel,
  snippetDisclosure: SnippetDisclosureBlockModel,
  uiPages: UiBlockModel,
  h: ApplicationViewBuilder,
): Html => {
  const renderCopyButton = SnippetCopyRenderer.renderer(snippetCopy, config =>
    h.block(SnippetCopyBinding.embedView(config)),
  )

  const renderSnippet = SnippetDisclosureRenderer.renderer(
    snippetDisclosure,
    renderCopyButton,
    config => h.block(SnippetDisclosureBinding.embedView(config)),
  )
  const renderHeadingLink = Prose.renderHeadingLink(
    hash => Message.ClickedCopyLink({ hash }),
    h,
  )

  const content =
    post.slug === 'foldkit-0-167-0'
      ? h.block(
          UiPagesBinding.embedView({
            slotId: 'blog-release-0167',
            model: uiPages,
            view: Release0167.view,
            viewInputs: { renderCopyButton, renderSnippet, renderHeadingLink },
          }),
        )
      : docPage(post.document, post.slug).view(
          renderCopyButton,
          renderSnippet,
          renderHeadingLink,
        )

  return Blog.BlogPostPage.view(post, content)
}

const lazyPostView = createKeyedLazy()

export const view = (
  model: Model,
  blogRoute: Blog | BlogPost,
  h: ApplicationViewBuilder,
): Html => {
  const content = Match.value(blogRoute).pipe(
    Match.withReturnType<Html>(),
    Match.tagsExhaustive({
      Blog: () => Blog.BlogIndex.view(),
      BlogPost: ({ postSlug }) =>
        Option.match(Blog.findPostBySlug(postSlug), {
          onNone: () => NotFound.view(postSlug, homeRouter()),
          onSome: post =>
            lazyPostView(post.slug, postView, [
              post,
              model.snippetCopy,
              model.snippetDisclosure,
              model.uiPages,
              h,
            ]),
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
          h.div([PagefindIgnore], [Docs.footerView(model, h)]),
        ],
      ),
    ],
  )
}

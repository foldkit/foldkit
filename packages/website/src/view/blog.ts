import { Match, Option } from 'effect'
import {
  Html,
  type HtmlBuilder,
  createKeyedLazy,
  inertHtml as ih,
} from 'foldkit/html'

import { Shared } from '../component'
import { Docs } from '../layout'
import { docPage } from '../markdown'
import { Message } from '../message'
import { type Model } from '../model'
import { Blog, NotFound, Ui } from '../page'
import * as Release0167 from '../page/blog/post/foldkit-0-167-0'
import * as Prose from '../prose'
import { type BlogPostRoute, type BlogRoute, homeRouter } from '../route'
import * as SnippetCopy from '../snippetCopy'
import * as SnippetDisclosure from '../snippetDisclosure'
import * as Search from './search'
import * as Sidebar from './sidebar'

const PagefindBody = ih.DataAttribute('pagefind-body', '')
const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')

const postView = (
  post: Blog.BlogPost,
  snippetCopy: SnippetCopy.Model,
  snippetDisclosure: SnippetDisclosure.Model,
  uiPages: Ui.Model,
  h: HtmlBuilder<Message>,
): Html => {
  const renderCopyButton = SnippetCopy.renderer(
    snippetCopy,
    message => Message.GotSnippetCopyMessage({ message }),
    h,
  )

  const renderSnippet = SnippetDisclosure.renderer(
    snippetDisclosure,
    message => Message.GotSnippetDisclosureMessage({ message }),
    renderCopyButton,
    h,
  )
  const renderHeadingLink = Prose.renderHeadingLink(
    hash => Message.ClickedCopyLink({ hash }),
    h,
  )

  const content =
    post.slug === 'foldkit-0-167-0'
      ? h.submodel({
          slotId: 'blog-release-0167',
          model: uiPages,
          view: Release0167.view,
          viewInputs: { renderCopyButton, renderSnippet, renderHeadingLink },
          toParentMessage: message => Message.GotUiPageMessage({ message }),
        })
      : docPage(post.document, post.slug).view(
          renderCopyButton,
          renderSnippet,
          renderHeadingLink,
        )

  return Blog.BlogPostPage.view(post, content)
}

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
          h.div([PagefindIgnore], [Docs.footerView(model.currentYear, h)]),
        ],
      ),
    ],
  )
}

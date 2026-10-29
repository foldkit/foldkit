import { type HtmlBuilder, createKeyedLazy } from 'foldkit/html'

type SnippetCopyBlockModel = typeof SnippetCopyBlock.Model.Type
type SnippetDisclosureBlockModel = typeof SnippetDisclosureBlock.Model.Type

// One view function serves every post. Turning the compiled markdown into a
// rendered page is the expensive part, so it belongs behind the memo.
const postView = (
  post: Post,
  snippetCopy: SnippetCopyBlockModel,
  snippetDisclosure: SnippetDisclosureBlockModel,
  h: HtmlBuilder<Message>,
) => {
  const renderCopyButton = SnippetCopy.renderer(snippetCopy, config =>
    h.block(SnippetCopyBinding.embedView(config)),
  )

  const content = docPage(post.document, post.slug).view(
    renderCopyButton,
    SnippetDisclosure.renderer(snippetDisclosure, renderCopyButton, config =>
      h.block(SnippetDisclosureBinding.embedView(config)),
    ),
    Prose.renderHeadingLink(hash => Message.ClickedCopyLink({ hash }), h),
  )

  return BlogPostPage.view(post, content)
}

// One slot per post, keyed by the same slug the route already uses to give
// the post its DOM identity.
const lazyPostView = createKeyedLazy()

// Navigating between posts moves between slots instead of overwriting one.
// Coming back to a post you already read returns its cached VNode.
const view = (
  post: Post,
  snippetCopy: SnippetCopyBlockModel,
  snippetDisclosure: SnippetDisclosureBlockModel,
  h: HtmlBuilder<Message>,
) =>
  lazyPostView(post.slug, postView, [post, snippetCopy, snippetDisclosure, h])

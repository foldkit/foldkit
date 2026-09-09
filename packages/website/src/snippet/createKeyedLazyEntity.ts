import { type HtmlBuilder, createKeyedLazy } from 'foldkit/html'

// One view function serves every post. Turning the compiled markdown into a
// rendered page is the expensive part, so it belongs behind the memo.
const postView = (
  post: Post,
  snippetCopy: SnippetCopy.Model,
  h: HtmlBuilder<Message>,
) =>
  BlogPostPage.view(
    post,
    SnippetCopy.renderer(
      snippetCopy,
      message => Message.GotSnippetCopyMessage({ message }),
      h,
    ),
    Prose.renderHeadingLink(hash => Message.ClickedCopyLink({ hash }), h),
  )

// One slot per post, keyed by the same slug the route already uses to give
// the post its DOM identity.
const lazyPostView = createKeyedLazy()

// Navigating between posts moves between slots instead of overwriting one.
// Coming back to a post you already read returns its cached VNode.
const view = (
  post: Post,
  snippetCopy: SnippetCopy.Model,
  h: HtmlBuilder<Message>,
) => lazyPostView(post.slug, postView, [post, snippetCopy, h])

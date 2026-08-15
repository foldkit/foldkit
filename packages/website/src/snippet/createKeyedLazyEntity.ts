import { type HtmlBuilder, createKeyedLazy } from 'foldkit/html'

// One view function serves every post. Turning the compiled markdown into a
// rendered page is the expensive part, so it belongs behind the memo.
const postView = (
  post: Post,
  copiedSnippets: CopiedSnippets,
  h: HtmlBuilder<Message>,
) =>
  h.article(
    [],
    [
      h.h1([], [post.frontmatter.title]),
      docPage(post.document, post.slug).view(copiedSnippets, h),
    ],
  )

// One slot per post, keyed by the same slug the route already uses to give
// the post its DOM identity.
const lazyPostView = createKeyedLazy()

// Navigating between posts moves between slots instead of overwriting one.
// Coming back to a post you already read returns its cached VNode.
const view = (
  post: Post,
  copiedSnippets: CopiedSnippets,
  h: HtmlBuilder<Message>,
) => lazyPostView(post.slug, postView, [post, copiedSnippets, h])

import { type Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { type DocPage, docPage } from '../../markdown'
import { type Message } from '../../message'
import { pageTitle } from '../../prose'
import { blogRouter } from '../../route'
import { type CopiedSnippets } from '../../view/codeBlock'
import { type BlogPost, formatPostDate } from './posts'

// VIEW

// NOTE: `docPage` decodes the compiled document and numbers its headings, so
// it must not run inside `view`, which runs on every render. The cache builds
// each post's DocPage on its first render rather than eagerly for every post
// at module load.
const docPageCache = new Map<string, DocPage>()

const postDocPage = (post: BlogPost): DocPage => {
  const cachedPage = docPageCache.get(post.slug)
  if (cachedPage !== undefined) {
    return cachedPage
  }
  const page = docPage(post.document, post.slug)
  docPageCache.set(post.slug, page)
  return page
}

const backToBlogLink: Html = ih.a(
  [
    ih.Href(blogRouter()),
    ih.Class(
      'inline-block mb-6 text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline',
    ),
  ],
  ['← Blog'],
)

export const view = (
  post: BlogPost,
  copiedSnippets: CopiedSnippets,
  h: HtmlBuilder<Message>,
): Html =>
  ih.article(
    [],
    [
      backToBlogLink,
      ih.header(
        [ih.Class('mb-8')],
        [
          pageTitle(post.slug, post.frontmatter.title),
          ih.p(
            [ih.Class('text-sm text-gray-500 dark:text-gray-400')],
            [formatPostDate(post.frontmatter.date)],
          ),
        ],
      ),
      postDocPage(post).view(copiedSnippets, h),
    ],
  )

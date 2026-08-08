import { Array } from 'effect'
import { type Html, inertHtml as ih } from 'foldkit/html'

import { pageTitle, para } from '../../prose'
import { blogPostRouter } from '../../route'
import { BLOG_DESCRIPTION, BLOG_TITLE } from './meta'
import { type BlogPost, formatPostDate, posts } from './posts'

// VIEW

const postEntry = (post: BlogPost): Html =>
  ih.keyed('article')(
    post.slug,
    [ih.Class('py-8 border-b border-gray-200 dark:border-gray-800')],
    [
      ih.p(
        [ih.Class('text-sm text-gray-500 dark:text-gray-400 mb-1')],
        [formatPostDate(post.frontmatter.date)],
      ),
      ih.h2(
        [ih.Class('text-2xl font-normal mb-2')],
        [
          ih.a(
            [
              ih.Href(blogPostRouter({ postSlug: post.slug })),
              ih.Class(
                'text-gray-900 dark:text-white hover:text-accent-600 dark:hover:text-accent-400 transition',
              ),
            ],
            [post.frontmatter.title],
          ),
        ],
      ),
      ih.p(
        [ih.Class('text-gray-600 dark:text-gray-300 leading-relaxed')],
        [post.frontmatter.description],
      ),
      ih.a(
        [
          ih.Href(blogPostRouter({ postSlug: post.slug })),
          ih.Class(
            'inline-block mt-3 text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline',
          ),
        ],
        ['Read more →'],
      ),
    ],
  )

export const view = (): Html =>
  ih.div(
    [],
    [
      pageTitle('blog', BLOG_TITLE),
      para(BLOG_DESCRIPTION),
      ih.div([ih.Class('mt-4')], Array.map(posts, postEntry)),
    ],
  )

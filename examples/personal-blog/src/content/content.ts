import { Array, Option, Schema as S } from 'effect'

import { MarkdownDocument, decodeDocument } from '@foldkit/markdown'

import aboutRaw from './about.md'
import makingThisBlogRaw from './making-this-blog.md'
import shootingFilmRaw from './shooting-film.md'

export const about: MarkdownDocument = decodeDocument(aboutRaw)

export const Post = S.Struct({
  slug: S.String,
  title: S.String,
  publishedOn: S.String,
  summary: S.String,
  document: MarkdownDocument,
})
export type Post = typeof Post.Type

export const posts: ReadonlyArray<Post> = [
  {
    slug: 'making-this-blog',
    title: 'Making This Blog',
    publishedOn: 'July 12, 2026',
    summary:
      'Markdown compiled into typed Foldkit views, with a live counter nestled between paragraphs.',
    document: decodeDocument(makingThisBlogRaw),
  },
  {
    slug: 'shooting-film',
    title: 'Shooting Film',
    publishedOn: 'June 28, 2026',
    summary: 'Thirty-six chances per roll, and why film is pleasing.',
    document: decodeDocument(shootingFilmRaw),
  },
]

export const findPost = (slug: string): Option.Option<Post> =>
  Array.findFirst(posts, post => post.slug === slug)

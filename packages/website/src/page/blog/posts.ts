import {
  Array,
  DateTime,
  Option,
  Order,
  Record as Record_,
  Schema as S,
  String as String_,
  pipe,
} from 'effect'

import { PostFrontmatter } from './frontmatter'

// POSTS

const documentByPath = import.meta.glob<unknown>('./post/*.md', {
  eager: true,
  import: 'default',
})

const frontmatterByPath = import.meta.glob<unknown>('./post/*.md', {
  eager: true,
  import: 'frontmatter',
})

/**
 * A blog post: its slug, its decoded frontmatter, and its compiled markdown
 * document. The document stays encoded here; the post page view turns it into
 * rendered prose. Keeping this module free of the view layer lets tests and
 * the app shell read post metadata without entering the render import graph.
 */
export type BlogPost = Readonly<{
  slug: string
  frontmatter: PostFrontmatter
  document: unknown
}>

const decodePostFrontmatter = S.decodeUnknownSync(PostFrontmatter)

const pathToSlug = (path: string): string =>
  pipe(path, String_.replace('./post/', ''), String_.replace(/\.md$/, ''))

const toBlogPost = (path: string, document: unknown): BlogPost => ({
  slug: pathToSlug(path),
  frontmatter: decodePostFrontmatter(
    Option.getOrUndefined(Record_.get(frontmatterByPath, path)),
  ),
  document,
})

const byDateThenSlugDescending: Order.Order<BlogPost> = Order.flip(
  Order.combine(
    Order.mapInput(Order.String, (post: BlogPost) => post.frontmatter.date),
    Order.mapInput(Order.String, (post: BlogPost) => post.slug),
  ),
)

/** Every blog post, newest first. */
export const posts: ReadonlyArray<BlogPost> = pipe(
  Object.entries(documentByPath),
  Array.map(([path, document]) => toBlogPost(path, document)),
  Array.sort(byDateThenSlugDescending),
)

/** Looks up a post by the slug in its URL. */
export const findPostBySlug = (slug: string): Option.Option<BlogPost> =>
  Array.findFirst(posts, post => post.slug === slug)

/** Formats a post's `YYYY-MM-DD` date for display, e.g. `August 1, 2026`. */
export const formatPostDate = (date: string): string =>
  Option.match(DateTime.make(date), {
    onNone: () => date,
    onSome: dateTime =>
      DateTime.formatUtc(dateTime, { dateStyle: 'long', locale: 'en-US' }),
  })
